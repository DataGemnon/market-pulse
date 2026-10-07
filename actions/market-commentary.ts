'use server';

import { unstable_cache } from 'next/cache';
import { getGeneralNews } from '@/lib/fmp';
import { extractMarketCommentary } from '@/lib/claude';
import { MarketCommentary } from '@/types';

async function computeMarketCommentary(): Promise<MarketCommentary[]> {
    const news = await getGeneralNews(25);
    if (news.length === 0) return [];
    return extractMarketCommentary(news);
}

// Same result for every visitor: this action is publicly callable, so the Claude
// call runs at most once every 30 minutes no matter how often it is invoked
const getCachedMarketCommentary = unstable_cache(computeMarketCommentary, ['market-commentary'], { revalidate: 1800 });

export async function getMarketCommentaryAction(): Promise<MarketCommentary[]> {
    try {
        return await getCachedMarketCommentary();
    } catch (error) {
        console.error('Market Commentary Action Error:', error);
        return [];
    }
}
