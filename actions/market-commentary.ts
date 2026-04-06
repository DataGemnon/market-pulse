'use server';

import { getGeneralNews } from '@/lib/fmp';
import { extractMarketCommentary } from '@/lib/claude';
import { MarketCommentary } from '@/types';

export async function getMarketCommentaryAction(): Promise<MarketCommentary[]> {
    try {
        const news = await getGeneralNews(25);
        if (news.length === 0) return [];

        return await extractMarketCommentary(news);
    } catch (error) {
        console.error('Market Commentary Action Error:', error);
        return [];
    }
}
