'use server';

import { getStockQuote } from '@/lib/fmp';
import { StockQuote } from '@/types';

export async function getStockQuoteAction(symbol: string): Promise<StockQuote> {
    return getStockQuote(symbol);
}
