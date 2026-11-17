import 'server-only';
import type Anthropic from '@anthropic-ai/sdk';
import { unstable_cache } from 'next/cache';
import { AI_MODEL, NO_ADVICE_RULE, WEB_SEARCH_TOOL, getAiClient, isAccountProblem, isAiEnabled, parseJsonObject, responseText } from '@/lib/ai';
import { getStore, isStoreConfigured } from '@/lib/store';
import { SHOCK_BASKET } from './basket';
import { detectShocks, type Shock } from './detect';
import { buildShockPrompt, fallbackExplanation, sanitizeExplanation, searchResultUrls, type ShockExplanation } from './explain';
import { fetchLiveTicks, getBasketSeries } from './series';

export type ShockWithExplanation = Shock & { explanation: ShockExplanation };

const HISTORY_SEC = 72 * 3600;
const SCAN_LOOKBACK_SEC = 4 * 3600;
const TICK_RETENTION_SEC = 4 * 24 * 3600;
const MAX_EXPLAIN_ATTEMPTS = 3;

/** Asks Claude, with web search, what caused the shock. */
export async function explainShock(shock: Shock): Promise<ShockExplanation> {
    if (!isAiEnabled()) return fallbackExplanation(shock, 'ai_unavailable');
    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: buildShockPrompt(shock, NO_ADVICE_RULE) }];
    const seen = new Set<string>();
    try {
        // Server-side search can pause a long turn; resume it a couple of times at most
        for (let attempt = 0; attempt < 3; attempt++) {
            const response = await getAiClient().messages.create({
                model: AI_MODEL,
                max_tokens: 2000,
                tools: [WEB_SEARCH_TOOL],
                messages,
            });
            searchResultUrls(response.content).forEach(url => seen.add(url));
            if (response.stop_reason === 'pause_turn') {
                messages.push({ role: 'assistant', content: response.content });
                continue;
            }
            return sanitizeExplanation(shock, parseJsonObject(responseText(response.content)), seen);
        }
        return fallbackExplanation(shock, 'error');
    } catch (error) {
        console.error(`explainShock ${shock.id} failed:`, error);
        return fallbackExplanation(shock, isAccountProblem(error) ? 'ai_unavailable' : 'error');
    }
}

// ── With Supabase: the cron stores ticks and shocks ───────────────────────

type ShockRow = {
    id: string; started_at: string; ended_at: string; severity: Shock['severity'];
    assets: Shock['assets']; explanation: ShockExplanation | null;
};

const toRow = (shock: Shock, explanation: ShockExplanation | null): ShockRow => ({
    id: shock.id,
    started_at: new Date(shock.startedAt * 1000).toISOString(),
    ended_at: new Date(shock.endedAt * 1000).toISOString(),
    severity: shock.severity,
    assets: shock.assets,
    explanation,
});

const fromRow = (row: ShockRow): ShockWithExplanation => {
    const shock: Shock = {
        id: row.id,
        startedAt: Date.parse(row.started_at) / 1000,
        endedAt: Date.parse(row.ended_at) / 1000,
        severity: row.severity,
        assets: row.assets,
    };
    return { ...shock, explanation: row.explanation ?? fallbackExplanation(shock, 'ai_unavailable') };
};

export type ScanResult = { ticks: number; shocks: number; explained: number; skipped?: string };

/** One cron pass: sample prices, detect, store and explain new shocks. */
export async function scanMarket(): Promise<ScanResult> {
    if (!isStoreConfigured()) return { ticks: 0, shocks: 0, explained: 0, skipped: 'no Supabase service role' };
    const store = getStore();
    const now = Math.floor(Date.now() / 1000);

    // Several schedulers may call us; one sample per ~50 s is enough
    const { data: lastTick } = await store.from('market_ticks').select('sampled_at').order('sampled_at', { ascending: false }).limit(1);
    const lastSampled = lastTick?.[0]?.sampled_at ? Date.parse(lastTick[0].sampled_at) / 1000 : 0;
    if (now - lastSampled < 50) return { ticks: 0, shocks: 0, explained: 0, skipped: 'sampled less than 50 s ago' };

    const ticks = await fetchLiveTicks();
    const sampledAt = new Date(now * 1000).toISOString();
    await store.from('market_ticks').upsert(
        ticks.map(tick => ({ ...tick, sampled_at: sampledAt })),
        { onConflict: 'symbol,t', ignoreDuplicates: true },
    );
    await store.from('market_ticks').delete().lt('t', now - TICK_RETENTION_SEC);

    const shocks = detectShocks(await getBasketSeries(SCAN_LOOKBACK_SEC), SHOCK_BASKET);
    if (shocks.length === 0) return { ticks: ticks.length, shocks: 0, explained: 0 };

    const { data: known } = await store
        .from('market_shocks')
        .select('id, explanation, explain_attempts')
        .in('id', shocks.map(s => s.id));
    const knownById = new Map((known ?? []).map(row => [row.id as string, row]));

    let explained = 0;
    for (const shock of shocks) {
        const previous = knownById.get(shock.id);
        const attempts = Number(previous?.explain_attempts ?? 0);
        // An ongoing shock keeps growing: store its latest shape, explain it until it works (3 tries max)
        const needsExplanation = previous?.explanation?.status !== 'ok' && attempts < MAX_EXPLAIN_ATTEMPTS;
        const row: Record<string, unknown> = toRow(shock, null);
        delete row.explanation;
        if (needsExplanation) {
            const explanation = await explainShock(shock);
            row.explanation = explanation;
            // Missing credit is not the model's fault: do not burn the attempts on it
            row.explain_attempts = explanation.status === 'ai_unavailable' ? attempts : attempts + 1;
            if (explanation.status === 'ok') explained++;
        }
        await store.from('market_shocks').upsert(row, { onConflict: 'id' });
    }
    return { ticks: ticks.length, shocks: shocks.length, explained };
}

// ── Without Supabase: compute from EODHD intraday history on the fly ──────

const recentFailures = new Map<string, { at: number; status: ShockExplanation['status'] }>();
const RETRY_AFTER_MS = 10 * 60 * 1000;

/** Caches successful explanations by shock id only; failures are retried after a pause. */
async function explainCached(shock: Shock): Promise<ShockExplanation> {
    if (!isAiEnabled()) return fallbackExplanation(shock, 'ai_unavailable');
    const failure = recentFailures.get(shock.id);
    if (failure && Date.now() - failure.at < RETRY_AFTER_MS) return fallbackExplanation(shock, failure.status);
    let attempt: ShockExplanation | null = null;
    try {
        return await unstable_cache(
            async () => {
                attempt = await explainShock(shock);
                // Throwing keeps a failed attempt out of the cache
                if (attempt.status !== 'ok') throw new Error(`explanation ${attempt.status}`);
                return attempt;
            },
            ['shock-explanation-v1', shock.id],
            { revalidate: 7 * 24 * 3600 },
        )();
    } catch {
        const result: ShockExplanation = attempt ?? fallbackExplanation(shock, 'error');
        recentFailures.set(shock.id, { at: Date.now(), status: result.status });
        return result;
    }
}

const detectFromHistory = unstable_cache(
    async (): Promise<Shock[]> => detectShocks(await getBasketSeries(HISTORY_SEC), SHOCK_BASKET),
    ['shock-history-v1'],
    { revalidate: 300 },
);

export async function listRecentShocks(): Promise<ShockWithExplanation[]> {
    if (isStoreConfigured()) {
        const since = new Date(Date.now() - HISTORY_SEC * 1000).toISOString();
        const { data, error } = await getStore()
            .from('market_shocks')
            .select('id, started_at, ended_at, severity, assets, explanation')
            .gte('started_at', since)
            .order('started_at', { ascending: false });
        if (!error && data) return (data as ShockRow[]).map(fromRow);
        console.error('market_shocks read failed, using history:', error?.message);
    }
    const shocks = (await detectFromHistory()).sort((a, b) => b.startedAt - a.startedAt);
    return Promise.all(shocks.map(async shock => ({ ...shock, explanation: await explainCached(shock) })));
}
