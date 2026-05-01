'use server';

import { getStockQuote, getBatchQuotes, searchStocks, type StockSearchResult } from '@/lib/fmp';
import { StockQuote } from '@/types';

export async function getStockQuoteAction(symbol: string): Promise<StockQuote> {
    return getStockQuote(symbol);
}

export async function getBatchQuotesAction(symbols: string[]): Promise<StockQuote[]> {
    return getBatchQuotes(symbols);
}

export async function searchStocksAction(query: string): Promise<StockSearchResult[]> {
    return searchStocks(query);
}

export type { StockSearchResult };
