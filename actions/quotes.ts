'use server';

import { getStockQuote, getBatchQuotes } from '@/lib/fmp';
import { StockQuote } from '@/types';

export async function getStockQuoteAction(symbol: string): Promise<StockQuote> {
    return getStockQuote(symbol);
}

export async function getBatchQuotesAction(symbols: string[]): Promise<StockQuote[]> {
    return getBatchQuotes(symbols);
}
