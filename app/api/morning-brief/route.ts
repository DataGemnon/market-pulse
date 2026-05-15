import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getGeneralNews, getMarketNews, getSectorPerformance, getMarketIndices, getEconomicCalendar } from '@/lib/fmp';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Yahoo Finance RSS ─────────────────────────────────────────────────────
// Free, no API key, covers Fed speeches / political events / macro surprises
// that financial data APIs often miss.
interface RSSItem { title: string; body: string; }

async function getYahooFinanceRSS(): Promise<RSSItem[]> {
    try {
        const res = await fetch('https://finance.yahoo.com/news/rssindex', {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketPulse/1.0)' },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return [];
        const xml = await res.text();

        const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
        return itemBlocks.slice(0, 12).map(block => {
            // Extract title — supports both plain and CDATA
            const titleMatch = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
            const descMatch  = block.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);

            const title = (titleMatch?.[1] ?? '').trim();
            // Strip HTML tags from description
            const body  = (descMatch?.[1]  ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 400);
            return { title, body };
        }).filter(item => item.title.length > 0);
    } catch {
        return []; // Fail silently — brief still works without this source
    }
}

// ── Today's economic releases ─────────────────────────────────────────────
// CPI, PPI, NFP, Fed decisions — with actual vs expected so Claude sees
// whether data surprised the market. Impact level shown as [HIGH]/[MEDIUM].
async function getTodaysEconomicEvents(): Promise<string> {
    try {
        const now       = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow  = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const from = yesterday.toISOString().split('T')[0];
        const to   = tomorrow.toISOString().split('T')[0];

        const events = await getEconomicCalendar(from, to);
        const significant = events.filter(e =>
            (e.impact === 'High' || e.impact === 'Medium') && e.country === 'US'
        );
        if (significant.length === 0) return 'No major US releases in this window';

        return significant.map(e => {
            const unit = e.unit || '';
            if (e.actual !== null && e.estimate !== null) {
                const beat = (e.actual as number) > (e.estimate as number) ? '📈 BEAT' : '📉 MISSED';
                return `[${e.impact.toUpperCase()}] ${e.event}: Actual ${e.actual}${unit} vs Expected ${e.estimate}${unit} (prev ${e.previous ?? 'N/A'}${unit}) — ${beat} estimates`;
            }
            if (e.actual !== null) {
                return `[${e.impact.toUpperCase()}] ${e.event}: Actual ${e.actual}${unit} (prev ${e.previous ?? 'N/A'}${unit})`;
            }
            return `[${e.impact.toUpperCase()}] ${e.event}: Expected ${e.estimate ?? 'N/A'}${unit} — upcoming`;
        }).join('\n');
    } catch {
        return 'Economic calendar unavailable';
    }
}

// ── Macro signals via Yahoo Finance (bond yields, VIX, Gold) ─────────────
// Kept as a compact structured block so Claude has numbers to anchor the
// narrative — but the ARTICLES are now the primary source of truth.
const MACRO_TICKERS = [
    { symbol: '^TNX', label: '10Y Treasury Yield', isYield: true  },
    { symbol: '^VIX', label: 'VIX (fear index)',   isYield: false },
    { symbol: 'GC=F', label: 'Gold',               isYield: false },
];

async function getMacroSnapshot(): Promise<string> {
    const lines = await Promise.all(
        MACRO_TICKERS.map(async ({ symbol, label, isYield }) => {
            try {
                const res = await fetch(
                    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
                    { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) }
                );
                if (!res.ok) return null;
                const json = await res.json();
                const meta = json.chart?.result?.[0]?.meta;
                if (!meta) return null;
                const price = meta.regularMarketPrice as number;
                const prev  = (meta.chartPreviousClose ?? meta.previousClose) as number;
                const chg   = price - prev;
                const sign  = chg >= 0 ? '+' : '';
                if (isYield) {
                    const bps = Math.abs(chg * 100).toFixed(1);
                    return `${label}: ${price.toFixed(3)}% (${chg >= 0 ? 'UP' : 'DOWN'} ${bps} bps)`;
                }
                return `${label}: ${price.toFixed(2)} (${sign}${((chg / prev) * 100).toFixed(2)}%)`;
            } catch { return null; }
        })
    );
    return lines.filter(Boolean).join(' | ') || 'unavailable';
}

// ── Build rich article feed ───────────────────────────────────────────────
// Each article is sent as TITLE + BODY (not just a headline).
// This is what lets Claude detect Fed speeches, political events, tariffs, etc.
interface ArticleSummary { source: string; title: string; body: string; }

async function buildArticleFeed(): Promise<ArticleSummary[]> {
    const [general, macroBondNews, rss] = await Promise.all([
        getGeneralNews(20).catch(() => []),
        getMarketNews(10, ['TLT', 'GLD', 'USO']).catch(() => []),   // bond/commodity angle
        getYahooFinanceRSS(),
    ]);

    const articles: ArticleSummary[] = [];
    const seen = new Set<string>();

    // FMP general news — comes with article text already
    for (const n of general) {
        const key = n.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        articles.push({
            source: n.site,
            title:  n.title,
            body:   (n.text ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 400),
        });
    }

    // FMP macro ETF news (bond / gold / oil stories)
    for (const n of macroBondNews) {
        const key = n.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        articles.push({
            source: n.site,
            title:  n.title,
            body:   (n.text ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 400),
        });
    }

    // Yahoo Finance RSS — best for Fed / political / macro surprise stories
    for (const r of rss) {
        const key = r.title.toLowerCase().slice(0, 60);
        if (seen.has(key)) continue;
        seen.add(key);
        articles.push({ source: 'Yahoo Finance', title: r.title, body: r.body });
    }

    return articles.slice(0, 22);
}

// ─────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    if (new Date().getDay() === 0) return NextResponse.json({ brief: null, sunday: true });

    const { watchlist } = await req.json();

    const [indices, sectors, macroSnapshot, economicEvents, articles] = await Promise.all([
        getMarketIndices().catch(() => []),
        getSectorPerformance().catch(() => []),
        getMacroSnapshot(),
        getTodaysEconomicEvents(),
        buildArticleFeed(),
    ]);

    const indicesText = indices
        .map(i => `${i.name}: ${i.changesPercentage >= 0 ? '+' : ''}${i.changesPercentage.toFixed(2)}%`)
        .join(' | ') || 'unavailable';

    const topSectors = [...sectors]
        .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
        .slice(0, 3)
        .map(s => `${s.sector}: ${s.changesPercentage >= 0 ? '+' : ''}${s.changesPercentage.toFixed(2)}%`)
        .join(' | ') || 'unavailable';

    // Format articles with full body text — this is the key change
    const articlesText = articles.map((a, i) =>
        `[${i + 1}] ${a.source.toUpperCase()}\nHeadline: ${a.title}\nContent: ${a.body || '(no excerpt)'}`
    ).join('\n\n');

    const watchlistText = Array.isArray(watchlist) && watchlist.length > 0
        ? watchlist.join(', ')
        : 'none';

    const prompt = `You are a market analyst writing a brief for a beginner investor.

Read the articles below carefully and identify the SINGLE most important story driving markets right now — it could be anything:
- A Fed Chair speech or rate decision
- Inflation data surprise (CPI, PPI)
- Political event (tariffs, elections, sanctions, geopolitics)
- Economic data (jobs, GDP, consumer confidence)
- A major corporate event
- Rising/falling bond yields and WHY

MARKET NUMBERS (context only — articles explain why):
Indices: ${indicesText}
Macro: ${macroSnapshot}
Sectors: ${topSectors}
User watchlist: ${watchlistText}

ECONOMIC DATA RELEASED TODAY (check for beats/misses — these move markets):
${economicEvents}

NEWS ARTICLES (READ THESE — this is the real story):
${articlesText}

Write exactly 3 short sentences for a beginner:
1. What is the main thing happening in markets today and why? (Be specific — name the event, not just the direction)
2. Explain it in plain English as if the reader has never invested before
3. One thing worth watching or knowing about today — ideally linked to their watchlist

Hard rules:
- Max 20 words per sentence
- Zero financial jargon — if you must use a term, explain it in the same sentence
- No "markets were mixed" without a cause
- No buy/sell advice
- Return ONLY the 3 sentences, nothing else`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 250,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
        return NextResponse.json({ brief: text });
    } catch (err) {
        console.error('morning-brief error:', err);
        return NextResponse.json({ brief: null, error: String(err) });
    }
}
