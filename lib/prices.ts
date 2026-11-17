import 'server-only';
import { fetchEODHD, toEODHDTicker } from '@/lib/eodhd';

/** Daily closes and live day changes shared by the MVP features (EODHD tickers or app symbols). */

export type DailyClose = { date: string; close: number };

type EodRow = { date: string; close: number; adjusted_close?: number };
type RealTimeRow = { code: string; change_p: number | 'NA'; close: number | 'NA'; timestamp: number | 'NA' };

const asTicker = (symbol: string) => (/\.(US|XETRA|FOREX|CC|INDX|LSE|TSE)$/i.test(symbol) ? symbol : toEODHDTicker(symbol));

/** Adjusted daily closes over the last `days` calendar days, cached 12 h. */
export async function getDailyCloses(symbol: string, days: number): Promise<DailyClose[]> {
    const from = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10);
    try {
        const rows = await fetchEODHD<EodRow[]>(`/eod/${asTicker(symbol)}`, { period: 'd', from }, 12 * 3600);
        if (!Array.isArray(rows)) return [];
        return rows.map(row => ({ date: row.date, close: row.adjusted_close ?? row.close })).filter(row => row.close > 0);
    } catch (error) {
        console.error(`daily closes ${symbol} failed:`, error);
        return [];
    }
}

/** Day change in % per symbol (as passed in), from the real-time endpoint, cached 60 s. */
export async function getDayChanges(symbols: string[]): Promise<Map<string, number>> {
    const changes = new Map<string, number>();
    const tickers = new Map(symbols.map(symbol => [asTicker(symbol).toUpperCase(), symbol]));
    const list = [...tickers.keys()];
    for (let i = 0; i < list.length; i += 15) {
        const [first, ...rest] = list.slice(i, i + 15);
        try {
            const data = await fetchEODHD<RealTimeRow | RealTimeRow[]>(`/real-time/${first}`, rest.length ? { s: rest.join(',') } : {}, 60);
            for (const row of Array.isArray(data) ? data : [data]) {
                const symbol = tickers.get(String(row.code).toUpperCase());
                if (symbol && typeof row.change_p === 'number') changes.set(symbol, row.change_p);
            }
        } catch (error) {
            console.error('real-time changes failed:', error);
        }
    }
    return changes;
}
