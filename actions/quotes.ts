'use server';

import { getStockQuote, getBatchQuotes, searchStocks, getMarketNews, getSectorPerformance } from '@/lib/market-data';
import { StockQuote, StockSearchResult, NewsArticle, SectorPerformance } from '@/types';

export async function getStockQuoteAction(symbol: string): Promise<StockQuote> {
    return getStockQuote(symbol);
}

export async function getBatchQuotesAction(symbols: string[]): Promise<StockQuote[]> {
    return getBatchQuotes(symbols);
}

export async function getMarketNewsAction(tickers: string[]): Promise<NewsArticle[]> {
    return getMarketNews(50, tickers.slice(0, 50));
}

export async function getSectorPerformanceAction(): Promise<SectorPerformance[]> {
    return getSectorPerformance();
}

export async function searchStocksAction(query: string): Promise<StockSearchResult[]> {
    if (!query.trim()) return [];
    return searchStocks(query).catch(() => [] as StockSearchResult[]);
}
