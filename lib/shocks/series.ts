import 'server-only';
import { fetchEODHD } from '@/lib/eodhd';
import { getStore, isStoreConfigured } from '@/lib/store';
import type { Bar } from './detect';
import { SHOCK_BASKET } from './basket';

/**
 * Price series for the shock basket.
 *
 * EODHD's intraday endpoint is only filled a few hours after the fact and has
 * no European intraday at all on our plan, so it serves history. "Live" data
 * comes from the real-time endpoint (US ETFs ~15 min delayed, FX and crypto
 * near live), sampled every minute by the cron and stored in Supabase.
 */

type IntradayRow = { timestamp: number; close: number | null };
type RealTimeRow = { code: string; timestamp: number | 'NA'; close: number | 'NA' };

export async function fetchIntradayBars(ticker: string, fromSec: number): Promise<Bar[]> {
    try {
        const rows = await fetchEODHD<IntradayRow[]>(`/intraday/${ticker}`, { interval: '1m', from: String(fromSec) }, 300);
        if (!Array.isArray(rows)) return [];
        return rows
            .filter(row => typeof row.close === 'number')
            .map(row => ({ t: row.timestamp, close: row.close as number }));
    } catch (error) {
        console.error(`intraday ${ticker} failed:`, error);
        return [];
    }
}

/** One real-time sample per basket asset (one EODHD request). */
export async function fetchLiveTicks(): Promise<{ symbol: string; t: number; price: number }[]> {
    const [first, ...rest] = SHOCK_BASKET.map(asset => asset.symbol);
    const data = await fetchEODHD<RealTimeRow | RealTimeRow[]>(`/real-time/${first}`, { s: rest.join(',') });
    const rows = Array.isArray(data) ? data : [data];
    return rows
        .filter(row => typeof row.timestamp === 'number' && typeof row.close === 'number')
        .map(row => ({ symbol: row.code.toUpperCase(), t: row.timestamp as number, price: row.close as number }));
}

async function loadStoredTicks(fromSec: number): Promise<Map<string, Bar[]>> {
    const bySymbol = new Map<string, Bar[]>();
    if (!isStoreConfigured()) return bySymbol;
    const { data, error } = await getStore()
        .from('market_ticks')
        .select('symbol, t, price')
        .gte('t', fromSec)
        .order('t', { ascending: true })
        .limit(20000);
    if (error) {
        console.error('market_ticks read failed:', error.message);
        return bySymbol;
    }
    for (const row of data ?? []) {
        const list = bySymbol.get(row.symbol) ?? [];
        list.push({ t: Number(row.t), close: Number(row.price) });
        bySymbol.set(row.symbol, list);
    }
    return bySymbol;
}

/** Merges two bar lists on timestamp, preferring the first one on duplicates. */
export function mergeBars(primary: Bar[], secondary: Bar[]): Bar[] {
    const byT = new Map<number, Bar>();
    for (const bar of secondary) byT.set(bar.t, bar);
    for (const bar of primary) byT.set(bar.t, bar);
    return [...byT.values()].sort((a, b) => a.t - b.t);
}

export async function getBasketSeries(lookbackSec: number): Promise<Map<string, Bar[]>> {
    const fromSec = Math.floor(Date.now() / 1000) - lookbackSec;
    const [stored, intraday] = await Promise.all([
        loadStoredTicks(fromSec),
        Promise.all(SHOCK_BASKET.map(async asset => [asset.symbol, await fetchIntradayBars(asset.symbol, fromSec)] as const)),
    ]);
    const series = new Map<string, Bar[]>();
    for (const [symbol, bars] of intraday) {
        series.set(symbol, mergeBars(bars, stored.get(symbol) ?? []));
    }
    return series;
}
