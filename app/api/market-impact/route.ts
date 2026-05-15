import { NextResponse } from 'next/server';
import { getGeneralNews, getEconomicCalendar } from '@/lib/fmp';
import { analyzeMarketImpact } from '@/lib/claude';

export const dynamic = 'force-dynamic';

// Yahoo Finance RSS — same helper as morning-brief, captures Fed/political stories
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

export async function GET() {
    try {
        const now       = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow  = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        const [news, events, rss] = await Promise.all([
            getGeneralNews(20).catch(() => []),
            getEconomicCalendar(
                yesterday.toISOString().split('T')[0],
                tomorrow.toISOString().split('T')[0]
            ).catch(() => []),
            getYahooRSS(),
        ]);

        const analysis = await analyzeMarketImpact(news, events, rss);
        return NextResponse.json(analysis);
    } catch (err) {
        console.error('market-impact route error:', err);
        return NextResponse.json({ error: 'Failed to analyze market' }, { status: 500 });
    }
}
