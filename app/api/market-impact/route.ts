import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { guardAiRoute } from '@/lib/rate-limit';
import { getGeneralNews, getEconomicCalendar, getMarketIndices } from '@/lib/fmp';
import { analyzeMarketImpact, type MarketImpactAnalysis } from '@/lib/claude';

export const dynamic = 'force-dynamic';

// Yahoo Finance RSS — captures Fed/political stories that FMP misses
async function getYahooRSS(): Promise<{ title: string; body: string }[]> {
    try {
        const res = await fetch('https://finance.yahoo.com/news/rssindex', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketPulse/1.0)' },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const xml = await res.text();
        const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
        return blocks.slice(0, 10).map(block => {
            const title = (block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] ?? '').trim();
            const body  = (block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] ?? '')
                .replace(/<[^>]+>/g, '').trim().slice(0, 350);
            return { title, body };
        }).filter(i => i.title.length > 0);
    } catch { return []; }
}

async function computeMarketImpact(): Promise<MarketImpactAnalysis> {
    {
        const now       = new Date();
        const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterday = cutoff24h.toISOString().split('T')[0];
        const tomorrow  = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [indices, news, events, rss] = await Promise.all([
            getMarketIndices().catch(() => []),
            getGeneralNews(25).catch(() => []),
            getEconomicCalendar(yesterday, tomorrow).catch(() => []),
            getYahooRSS(),
        ]);

        // ── Hard market direction anchor ──────────────────────────────────
        // Compute from live S&P 500 so Claude cannot contradict the actual move
        const spChange = indices.find(i =>
            i.symbol === '^GSPC' || i.name?.includes('S&P')
        )?.changesPercentage ?? 0;

        const marketDirection =
            spChange >  0.5 ? `MARKETS ARE UP TODAY (+${spChange.toFixed(2)}%)` :
            spChange < -0.5 ? `MARKETS ARE DOWN TODAY (${spChange.toFixed(2)}%)` :
                              `MARKETS ARE ROUGHLY FLAT TODAY (${spChange.toFixed(2)}%)`;

        const indicesText = indices
            .map(i => `${i.name}: ${i.changesPercentage >= 0 ? '+' : ''}${i.changesPercentage.toFixed(2)}%`)
            .join(' | ') || 'unavailable';

        // ── Filter articles to last 24 hours ──────────────────────────────
        // Prevents Claude reading yesterday's "record high" stories when market is down today
        const recentNews = news.filter(n =>
            !n.publishedDate || new Date(n.publishedDate) >= cutoff24h
        );

        const analysis = await analyzeMarketImpact(
            recentNews,
            events,
            rss,
            marketDirection,
            indicesText,
        );

        return analysis;
    }
}

// Same analysis for every visitor: compute at most once every 15 minutes
const getCachedMarketImpact = unstable_cache(computeMarketImpact, ['market-impact'], { revalidate: 900 });

export async function GET(req: NextRequest) {
    const limited = await guardAiRoute(req, { route: 'market-impact', anonPerHour: 30, userPerHour: 60 });
    if (limited) return limited;

    try {
        return NextResponse.json(await getCachedMarketImpact());
    } catch (err) {
        console.error('market-impact route error:', err);
        return NextResponse.json({ error: 'Failed to analyze market' }, { status: 500 });
    }
}
