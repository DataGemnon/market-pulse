import { NextRequest, NextResponse } from 'next/server';
import { getMarketNews } from '@/lib/fmp';
import { getEODHDNews, isNonUSSymbol } from '@/lib/eodhd';
import { summarizeStockNews } from '@/lib/claude';
import type { NewsArticle } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const { symbol }: { symbol: string } = await req.json();
    if (!symbol) return NextResponse.json(null);

    try {
        const nonUS = isNonUSSymbol(symbol);

        // Route to EODHD (non-US) or FMP (US)
        const articles: NewsArticle[] = nonUS
            ? await getEODHDNews(symbol, 20)
            : await getMarketNews(20, [symbol]);

        if (!articles || articles.length === 0) return NextResponse.json(null);

        // Time windows:
        //  • US stocks     → today only
        //  • Non-US stocks → today first, fall back to 7 days
        //    (small-cap EU stocks publish news infrequently)
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const todaysArticles = articles.filter(a => new Date(a.publishedDate) >= todayStart);

        let recentArticles: NewsArticle[];
        if (todaysArticles.length > 0) {
            recentArticles = todaysArticles;
        } else if (nonUS) {
            // Broader window for non-US / small-cap stocks
            recentArticles = articles.filter(a => new Date(a.publishedDate) >= sevenDaysAgo);
        } else {
            return NextResponse.json(null);
        }

        if (recentArticles.length === 0) return NextResponse.json(null);

        const articleData = recentArticles.map(a => ({
            title: a.title,
            source: a.site,
            publishedDate: a.publishedDate,
        }));

        const analysis = await summarizeStockNews(symbol, articleData);

        return NextResponse.json({
            ...analysis,
            articles: recentArticles,
        });
    } catch (err) {
        console.error(`/api/smart-news error for ${symbol}:`, err);
        return NextResponse.json(null);
    }
}
