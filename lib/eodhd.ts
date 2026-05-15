/**
 * EODHD (EOD Historical Data) API helper
 * Used for: news, analyst ratings, and stock search for European & Asian markets
 * API key: EODHD_API_KEY (server-side only — never expose client-side)
 */

import { NewsArticle, AnalystConsensus, StockSearchResult } from '@/types';

const BASE_URL = 'https://eodhd.com/api';
const API_KEY = process.env.EODHD_API_KEY;

// ── Symbol format helpers ─────────────────────────────────────────────────

/**
 * Detect non-US symbols — anything with a dot-suffix like .PA, .DE, .L, .HK, .T
 * Exported so other modules can use the same logic.
 */
export function isNonUSSymbol(symbol: string): boolean {
    return /\.[A-Za-z]{1,5}$/.test(symbol);
}

/**
 * Convert Yahoo Finance-style suffixes to EODHD format.
 * Most suffixes are the same; the main differences are:
 *   .L  (Yahoo London)       → .LSE   (EODHD)
 *   .DE (Yahoo Frankfurt)    → .XETRA (EODHD)
 *   .T  (Yahoo Tokyo)        → .TSE   (EODHD)
 */
function toEODHDSymbol(symbol: string): string {
    return symbol
        .replace(/\.L$/i, '.LSE')
        .replace(/\.DE$/i, '.XETRA')
        .replace(/\.T$/i, '.TSE');
    // .PA (Paris), .AS (Amsterdam), .MI (Milan), .HK (Hong Kong),
    // .SS (Shanghai), .MC (Madrid) are identical in both Yahoo & EODHD.
}

/**
 * Convert EODHD exchange codes back to Yahoo Finance-style suffixes.
 * Used so that symbols returned by EODHD search can be stored in the watchlist
 * in Yahoo-compatible format (which getYahooQuote understands).
 */
function eohdExchangeToYahooSuffix(exchange: string): string {
    switch (exchange.toUpperCase()) {
        case 'LSE':   return 'L';
        case 'XETRA': return 'DE';
        case 'TSE':   return 'T';
        case 'US':
        case 'NYSE':
        case 'NASDAQ':
        case 'BATS':  return '';   // US stocks — no suffix needed
        default:      return exchange;   // .PA, .AS, .HK, etc. — keep as-is
    }
}

// ── Core fetch helper ─────────────────────────────────────────────────────

async function fetchEODHD<T = unknown>(
    endpoint: string,
    params: Record<string, string> = {}
): Promise<T> {
    if (!API_KEY) throw new Error('EODHD_API_KEY environment variable is not set');
    const query = new URLSearchParams({ api_token: API_KEY, fmt: 'json', ...params }).toString();
    const url = `${BASE_URL}${endpoint}?${query}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`EODHD API Error ${res.status}: ${body}`);
    }
    return res.json() as Promise<T>;
}

// ── News ──────────────────────────────────────────────────────────────────

/**
 * Fetch recent news for a non-US stock ticker.
 * Returns articles formatted as NewsArticle[] (same shape as FMP news).
 */
export async function getEODHDNews(symbol: string, limit = 20): Promise<NewsArticle[]> {
    try {
        const eoSymbol = toEODHDSymbol(symbol);
        const data = await fetchEODHD<any[]>('/news', {
            s: eoSymbol,
            limit: String(limit),
            offset: '0',
        });
        if (!Array.isArray(data)) return [];

        return data.map((item: any): NewsArticle => {
            // Extract hostname as a readable "site" name
            let site = 'EODHD';
            try { site = new URL(item.link || '').hostname.replace(/^www\./, ''); } catch {}

            return {
                symbol,
                publishedDate: item.date || new Date().toISOString(),
                title: item.title || '',
                image: item.image || '',
                site,
                text: item.content || item.summary || '',
                url: item.link || '',
            };
        });
    } catch (err) {
        console.error(`EODHD news error for ${symbol}:`, err);
        return [];
    }
}

// ── Analyst Consensus ─────────────────────────────────────────────────────

/**
 * Fetch analyst buy/hold/sell consensus for a non-US stock.
 * Returns a single AnalystConsensus or null if unavailable.
 */
export async function getEODHDAnalystConsensus(symbol: string): Promise<AnalystConsensus | null> {
    try {
        const eoSymbol = toEODHDSymbol(symbol);
        const data = await fetchEODHD<any>(`/analyst-ratings/${eoSymbol}`);
        if (!data || typeof data !== 'object') return null;

        // Handle both flat shape and nested { rating: { ... } } shape
        const r = data.rating ?? data;

        const strongBuy  = r.strongBuy   ?? r.strong_buy   ?? 0;
        const buy        = r.buy         ?? 0;
        const hold       = r.hold        ?? r.neutral      ?? 0;
        const sell       = r.sell        ?? 0;
        const strongSell = r.strongSell  ?? r.strong_sell  ?? 0;

        // Return null if all counts are zero (no meaningful data)
        if (strongBuy + buy + hold + sell + strongSell === 0) return null;

        return {
            symbol,
            date: (data.date ?? r.date ?? new Date().toISOString().split('T')[0]) as string,
            strongBuy,
            buy,
            hold,
            sell,
            strongSell,
        };
    } catch (err) {
        console.error(`EODHD analyst consensus error for ${symbol}:`, err);
        return null;
    }
}

// ── Stock Search ──────────────────────────────────────────────────────────

/**
 * Search for stocks globally via EODHD.
 * Returns results with symbols in Yahoo Finance-compatible format
 * so they work seamlessly with getYahooQuote / getBatchQuotes.
 */
export async function searchEODHD(query: string, limit = 8): Promise<StockSearchResult[]> {
    try {
        const data = await fetchEODHD<any[]>(`/search/${encodeURIComponent(query)}`, {
            limit: String(limit),
            type: 'stock',
        });
        if (!Array.isArray(data)) return [];

        return data
            .filter((item: any) => item.Code && item.Exchange && item.Name)
            .map((item: any): StockSearchResult => {
                const suffix = eohdExchangeToYahooSuffix(item.Exchange);
                const symbol = suffix ? `${item.Code}.${suffix}` : item.Code;
                return {
                    symbol,
                    name: item.Name || item.Code,
                    exchange: item.Exchange,
                    currency: item.Currency || '',
                };
            })
            .filter(r => Boolean(r.symbol));
    } catch (err) {
        console.error('EODHD search error:', err);
        return [];
    }
}
