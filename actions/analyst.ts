'use server';

import { getAnalystConsensus, getFinnhubRecommendation, getDiscoveryStocks, getRecentRatingChanges } from '@/lib/fmp';
import { AnalystConsensus, RatingChange } from '@/types';

async function getConsensusForSymbol(sym: string): Promise<AnalystConsensus[]> {
    const finnhub = await getFinnhubRecommendation(sym);
    if (finnhub.length >= 2) return finnhub;
    const fmp = await getAnalystConsensus(sym);
    if (fmp.length >= 1) return fmp;
    return finnhub.length > 0 ? finnhub : [];
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
