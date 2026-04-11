'use server';

import { getAnalystConsensus, getFinnhubRecommendation, getDiscoveryStocks } from '@/lib/fmp';
import { AnalystConsensus } from '@/types';

interface ConsensusWithShift extends AnalystConsensus {
    buyShift: number;
    totalAnalysts: number;
    bullPercent: number;
}

async function getConsensusForSymbol(sym: string): Promise<AnalystConsensus[]> {
    // Try Finnhub first (more detailed data), fallback to FMP
    const finnhub = await getFinnhubRecommendation(sym);
    if (finnhub.length >= 2) return finnhub;
    const fmp = await getAnalystConsensus(sym);
    if (fmp.length >= 1) return fmp;
    return finnhub.length > 0 ? finnhub : [];
}

function computeShift(data: AnalystConsensus[]): ConsensusWithShift | null {
    if (data.length === 0) return null;

    const current = data[0];
    const totalAnalysts = current.strongBuy + current.buy + current.hold + current.sell + current.strongSell;
    if (totalAnalysts === 0) return null;

    const currentBulls = current.strongBuy + current.buy;
    let buyShift = 0;

    if (data.length >= 2) {
        const previous = data[1];
        const previousBulls = previous.strongBuy + previous.buy;
        buyShift = currentBulls - previousBulls;
    }

    return {
        ...current,
        buyShift,
        totalAnalysts,
        bullPercent: Math.round((currentBulls / totalAnalysts) * 100),
    };
}

export async function getAnalystConsensusAction(): Promise<ConsensusWithShift[]> {
    const symbols = getDiscoveryStocks().slice(0, 15);
    const results: ConsensusWithShift[] = [];

    for (const sym of symbols) {
        try {
            const data = await getConsensusForSymbol(sym);
            const result = computeShift(data);
            if (result) results.push(result);
        } catch {
            // skip symbol
        }
        await new Promise(r => setTimeout(r, 100));
    }

    // Sort: biggest movers first (by absolute shift), then by bull percent
    return results.sort((a, b) => {
        if (Math.abs(b.buyShift) !== Math.abs(a.buyShift)) {
            return Math.abs(b.buyShift) - Math.abs(a.buyShift);
        }
        return b.bullPercent - a.bullPercent;
    });
}

export async function getWatchlistConsensusAction(watchlist: string[]): Promise<AnalystConsensus[]> {
    const results: AnalystConsensus[] = [];
    for (const sym of watchlist) {
        try {
            const data = await getConsensusForSymbol(sym);
            if (data.length > 0) results.push(data[0]);
        } catch {
            // skip
        }
        await new Promise(r => setTimeout(r, 100));
    }
    return results;
}
