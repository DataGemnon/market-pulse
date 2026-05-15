'use server';

import { getStockQuote, getBatchQuotes, searchStocks } from '@/lib/fmp';
import { searchEODHD } from '@/lib/eodhd';
import { StockQuote, StockSearchResult } from '@/types';

export async function getStockQuoteAction(symbol: string): Promise<StockQuote> {
    return getStockQuote(symbol);
}

export async function getBatchQuotesAction(symbols: string[]): Promise<StockQuote[]> {
    return getBatchQuotes(symbols);
}

export async function searchStocksAction(query: string): Promise<StockSearchResult[]> {
    if (!query.trim()) return [];

    // Run FMP (US-focused) and EODHD (global) searches in parallel
    const [fmpResults, eohdResults] = await Promise.all([
        searchStocks(query).catch(() => [] as StockSearchResult[]),
        searchEODHD(query, 8).catch(() => [] as StockSearchResult[]),
    ]);

    // Merge: FMP results first (US stocks), then EODHD non-US results
    // Deduplicate by symbol so US stocks don't appear twice
    const seen = new Set<string>();
    const merged: StockSearchResult[] = [];

    for (const r of fmpResults) {
        if (!seen.has(r.symbol)) {
            seen.add(r.symbol);
            merged.push(r);
        }
    }
    for (const r of eohdResults) {
        // Only add if not already in FMP results and it's a non-US stock
        // (EODHD US results are lower quality than FMP)
        if (!seen.has(r.symbol) && r.symbol.includes('.')) {
            seen.add(r.symbol);
            merged.push(r);
        }
    }

    return merged.slice(0, 10);
}
