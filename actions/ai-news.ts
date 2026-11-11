'use server';

import { getEODHDNews, isNonUSSymbol } from '@/lib/eodhd';
import { summarizeStockNews } from '@/lib/claude';
import { NewsArticle, SmartNewsResult } from '@/types';

export async function getSmartNewsForStock(symbol: string): Promise<SmartNewsResult | null> {
    try {
        const nonUS = isNonUSSymbol(symbol);

        const articles: NewsArticle[] = await getEODHDNews(symbol, 20);

        if (!articles || articles.length === 0) return null;

        // For US stocks: only use articles published today
        // For non-US stocks: extend to 3 days (European/Asian news is less frequent)
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todaysArticles = articles.filter(a => new Date(a.publishedDate) >= todayStart);

        let recentArticles: NewsArticle[];
        if (todaysArticles.length > 0) {
            recentArticles = todaysArticles;
        } else if (nonUS) {
            // Broader window for non-US / small-cap stocks (earnings may be days old)
            recentArticles = articles.filter(a => new Date(a.publishedDate) >= sevenDaysAgo);
        } else {
            return null; // US stock with no news today — skip
        }

        if (recentArticles.length === 0) return null;

        const articleData = recentArticles.map(a => ({
            title: a.title,
            source: a.site,
            publishedDate: a.publishedDate,
        }));

        const analysis = await summarizeStockNews(symbol, articleData);

        return {
            ...analysis,
            articles: recentArticles,
        };
    } catch (error) {
        console.error(`Error in getSmartNewsForStock for ${symbol}:`, error);
        return null;
    }
}
