import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getDailyCloses, getDayChanges } from '@/lib/prices';
import { benchmarkFor } from '@/lib/shocks/basket';
import { computeBeta, readImpact, type ImpactRow } from '@/lib/shocks/impact';
import { listRecentShocks } from '@/lib/shocks/service';

export const dynamic = 'force-dynamic';

const MAX_SYMBOLS = 30;
const BETA_WINDOW_DAYS = 200;
const SYMBOL_RE = /^[A-Z0-9^.\-]{1,20}$/i;

/** Impact of one detected shock on the caller's watchlist. Deterministic, no AI. */
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!(await rateLimit(`shock-impact:${ip}`, 60, 3600))) {
        return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }

    const body = (await req.json().catch(() => null)) as { shockId?: string; symbols?: string[] } | null;
    const symbols = (body?.symbols ?? []).filter(s => typeof s === 'string' && SYMBOL_RE.test(s)).slice(0, MAX_SYMBOLS);
    if (!body?.shockId || symbols.length === 0) return NextResponse.json({ rows: [] });

    // The shock comes from our own detection, never from the request body
    const shock = (await listRecentShocks()).find(s => s.id === body.shockId);
    if (!shock) return NextResponse.json({ error: 'Choc inconnu' }, { status: 404 });

    const benchmarks = [...new Set(symbols.map(s => benchmarkFor(s).symbol))];
    const [dayChanges, benchCloses, stockCloses] = await Promise.all([
        getDayChanges([...symbols, ...benchmarks]),
        Promise.all(benchmarks.map(async b => [b, await getDailyCloses(b, BETA_WINDOW_DAYS)] as const)).then(e => new Map(e)),
        Promise.all(symbols.map(s => getDailyCloses(s, BETA_WINDOW_DAYS))),
    ]);
    const shockIsToday = new Date(shock.startedAt * 1000).toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);

    const rows: ImpactRow[] = symbols.map((symbol, i) => {
        const bench = benchmarkFor(symbol);
        const beta = computeBeta(stockCloses[i], benchCloses.get(bench.symbol) ?? []);
        const benchmarkMovePct = shock.assets.find(a => a.symbol === bench.symbol)?.movePct ?? null;
        const partial = {
            symbol,
            benchmark: bench.label,
            beta,
            benchmarkMovePct,
            expectedMovePct: beta !== null && benchmarkMovePct !== null ? beta * benchmarkMovePct : null,
            dayChangePct: shockIsToday ? dayChanges.get(symbol) ?? null : null,
            benchmarkDayChangePct: shockIsToday ? dayChanges.get(bench.symbol) ?? null : null,
        };
        return { ...partial, reading: readImpact(partial) };
    });

    return NextResponse.json({ rows });
}
