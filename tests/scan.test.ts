import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { Bar } from '@/lib/shocks/detect';

/**
 * The cron pass (scanMarket) against an in-memory stand-in for Supabase,
 * replaying the 2025-04-09 tariff-pause session as if it were live.
 */

type Row = Record<string, unknown>;
const tables: Record<string, Row[]> = { market_ticks: [], market_shocks: [] };

function query(table: string) {
    const rows = () => tables[table];
    const filters: ((r: Row) => boolean)[] = [];
    let sortKey: string | null = null;
    let ascending = true;
    let max = Infinity;
    const run = () => {
        let out = rows().filter(r => filters.every(f => f(r)));
        if (sortKey) {
            const key = sortKey;
            out = [...out].sort((a, b) => (String(a[key]) < String(b[key]) ? -1 : 1) * (ascending ? 1 : -1));
        }
        return { data: out.slice(0, max), error: null };
    };
    const builder = {
        select: () => builder,
        order: (key: string, opts: { ascending: boolean }) => { sortKey = key; ascending = opts.ascending; return builder; },
        limit: (n: number) => { max = n; return builder; },
        gte: (key: string, value: unknown) => { filters.push(r => (r[key] as number) >= (value as number)); return builder; },
        in: (key: string, values: unknown[]) => { filters.push(r => values.includes(r[key])); return builder; },
        then: (resolve: (v: unknown) => void) => resolve(run()),
        upsert: async (input: Row | Row[], opts: { onConflict: string; ignoreDuplicates?: boolean }) => {
            const keys = opts.onConflict.split(',');
            for (const row of Array.isArray(input) ? input : [input]) {
                const existing = tables[table].find(r => keys.every(k => r[k] === row[k]));
                if (!existing) tables[table].push({ ...row });
                else if (!opts.ignoreDuplicates) Object.assign(existing, row);
            }
            return { error: null };
        },
        delete: () => ({
            lt: async (key: string, value: number) => {
                tables[table] = tables[table].filter(r => !((r[key] as number) < value));
                return { error: null };
            },
        }),
    };
    return builder;
}

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn }));
vi.mock('@/lib/store', () => ({ isStoreConfigured: () => true, getStore: () => ({ from: query }) }));

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'tariff-pause-2025-04-09.json'), 'utf8')) as Record<string, [number, number][]>;
let clock = 0; // replayed "now", unix seconds

vi.mock('@/lib/shocks/series', () => ({
    fetchLiveTicks: async () => Object.entries(fixture).flatMap(([symbol, rows]) => {
        const last = rows.filter(([t]) => t <= clock).pop();
        return last ? [{ symbol, t: last[0], price: last[1] }] : [];
    }),
    // History endpoint: nothing (as if intraday were not filled yet); only stored ticks count
    getBasketSeries: async () => {
        const series = new Map<string, Bar[]>();
        for (const row of tables.market_ticks) {
            const list = series.get(row.symbol as string) ?? [];
            list.push({ t: row.t as number, close: row.price as number });
            series.set(row.symbol as string, list);
        }
        return series;
    },
}));

const explainCalls: string[] = [];
vi.mock('@/lib/ai', async importOriginal => ({
    ...(await importOriginal<typeof import('@/lib/ai')>()),
    isAiEnabled: () => true,
    getAiClient: () => ({
        messages: {
            create: async () => {
                explainCalls.push('call');
                return {
                    stop_reason: 'end_turn',
                    content: [
                        { type: 'web_search_tool_result', content: [{ type: 'web_search_result', url: 'https://truthsocial.com/x', title: 'post' }] },
                        { type: 'text', text: '{"cause":"Pause de 90 jours sur les droits de douane annoncée à 19h18","confidence":"confirmée","lesson":"…","channels":[],"sources":[{"title":"post","url":"https://truthsocial.com/x"},{"title":"fake","url":"https://made-up.example"}]}' },
                    ],
                };
            },
        },
    }),
}));

const { scanMarket } = await import('@/lib/shocks/service');

describe('scanMarket (cron pass)', () => {
    beforeEach(() => {
        tables.market_ticks = [];
        tables.market_shocks = [];
        explainCalls.length = 0;
    });

    it('stores one tick per minute, detects the tariff-pause shock live and explains it once', async () => {
        vi.useFakeTimers();
        const start = Date.UTC(2025, 3, 9, 16, 0) / 1000;
        for (clock = start; clock <= Date.UTC(2025, 3, 9, 17, 40) / 1000; clock += 60) {
            vi.setSystemTime(clock * 1000);
            await scanMarket();
        }
        vi.useRealTimers();

        const shock = tables.market_shocks.find(r => String(r.id).startsWith('shock-2025-04-09T17:19'));
        expect(shock).toBeDefined();
        const explanation = shock!.explanation as { status: string; confidence: string; sources: { url: string }[] };
        expect(explanation.status).toBe('ok');
        // URLs the model did not see in its search results are dropped
        expect(explanation.sources.map(s => s.url)).toEqual(['https://truthsocial.com/x']);
        expect(explainCalls.length).toBe(tables.market_shocks.length);
    });

    it('samples at most once per 50 seconds', async () => {
        vi.useFakeTimers();
        clock = Date.UTC(2025, 3, 9, 16, 0) / 1000;
        vi.setSystemTime(clock * 1000);
        expect((await scanMarket()).ticks).toBeGreaterThan(0);
        vi.setSystemTime(clock * 1000 + 20_000);
        expect((await scanMarket()).skipped).toMatch(/50 s/);
        vi.useRealTimers();
    });
});
