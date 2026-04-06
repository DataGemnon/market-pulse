'use server';

import { getMarketNews } from '@/lib/fmp';
import { summarizeStockNews } from '@/lib/claude';
import { NewsArticle } from '@/types';

export interface SmartNewsResult {
    symbol: string;
    summary: string;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
    articles: NewsArticle[];
}

export async function getSmartNewsForStock(symbol: string): Promise<SmartNewsResult | null> {
    try {
        // 1. Fetch recent news for the stock
        const articles = await getMarketNews(20, [symbol]);

        if (!articles || articles.length === 0) {
            return null; // Or return a "no news" object
        }

        // Filter for "Today's News" only
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaysArticles = articles.filter(a => {
            const pubDate = new Date(a.publishedDate);
            return pubDate >= today;
        });

        if (todaysArticles.length === 0) {
            return null; // No news today, so don't show anything
        }

        // Use filtered articles for analysis
        const recentArticles = todaysArticles;

        // 2. Prepare data for Claude
        // We only need title and source for the summary to save tokens/time, 
        // but maybe description (text) is useful if titles are clickbaity.
        // Let's us title + text (truncated) for better context.
        const articleData = recentArticles.map(a => ({
            title: a.title,
            source: a.site,
            publishedDate: a.publishedDate
        }));

        // 3. Generate Summary
        const analysis = await summarizeStockNews(symbol, articleData);

        return {
            ...analysis,
            articles: recentArticles
        };

    } catch (error) {
        console.error(`Error in getSmartNewsForStock for ${symbol}:`, error);
        return null;
    }
}
