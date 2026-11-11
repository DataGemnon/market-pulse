'use server';

import { getFinnhubRecommendation, getRecentRatingChanges } from '@/lib/market-data';
import { getEODHDAnalystConsensus, isNonUSSymbol } from '@/lib/eodhd';
import { AnalystConsensus, RatingChange } from '@/types';

async function getConsensusForSymbol(sym: string): Promise<AnalystConsensus[]> {
    // US stocks: Finnhub first (monthly history), fall back to EODHD.
    // Non-US stocks: EODHD only (Finnhub's free tier is US-only).
    if (!isNonUSSymbol(sym)) {
        const finnhub = await getFinnhubRecommendation(sym);
        if (finnhub.length > 0) return finnhub;
    }
    const result = await getEODHDAnalystConsensus(sym);
    return result ? [result] : [];
}

export async function getWatchlistConsensusAction(watchlist: string[]): Promise<AnalystConsensus[]> {
    const results: AnalystConsensus[] = [];
    for (const sym of watchlist) {
        try {
            const data = await getConsensusForSymbol(sym);
            if (data.length > 0) results.push(data[0]);
        } catch { /* skip */ }
        await new Promise(r => setTimeout(r, 100));
    }
    return results;
}

export async function getRecentRatingChangesAction(): Promise<RatingChange[]> {
    return getRecentRatingChanges();
}

export async function getWatchlistRatingChangesAction(watchlist: string[]): Promise<RatingChange[]> {
    return getRecentRatingChanges(watchlist);
}
