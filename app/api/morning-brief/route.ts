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

// ETF tickers to strip from article content before sending to Claude
// so the brief never says "QQQ fell" — it should say "Nasdaq fell"
const ETF_TICKER_RE = /\b(QQQ|SPY|IWM|DIA|TLT|GLD|SLV|USO|UUP|XLK|XLF|XLE|XLV|XLY|XLP|XLC|XLI|XLB|XLRE|XLU|VXX|UVXY|SQQQ|TQQQ)\b/g;
const ETF_LABEL_MAP: Record<string, string> = {
    QQQ: 'Nasdaq', SPY: 'S&P 500', DIA: 'Dow Jones', IWM: 'small-cap stocks',
    TLT: 'long-term bonds', GLD: 'gold', USO: 'oil', UUP: 'US dollar',
};
function stripEtfTickers(text: string): string {
    return text.replace(ETF_TICKER_RE, t => ETF_LABEL_MAP[t] ?? t);
}

// ── Build rich article feed ───────────────────────────────────────────────
// Articles filtered to last 24 hours only — prevents Claude from reading
// yesterday's bullish articles and generating a brief that contradicts
// today's actual market direction.
interface ArticleSummary { source: string; title: string; body: string; }

async function buildArticleFeed(): Promise<ArticleSummary[]> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [general, macroBondNews, rss] = await Promise.all([
        getGeneralNews(25).catch(() => []),
        getMarketNews(10, ['TLT', 'GLD', 'USO']).catch(() => []),
        getYahooFinanceRSS(),
    ]);

    const articles: ArticleSummary[] = [];
    const seen = new Set<string>();

    const add = (source: string, title: string, body: string, date?: string) => {
        // Drop articles older than 24 h (skip if no date — keep RSS items which have no timestamp here)
        if (date && new Date(date) < cutoff) return;
        const key = title.toLowerCase().slice(0, 60);
        if (seen.has(key) || !title) return;
        seen.add(key);
        articles.push({
            source,
            title:  stripEtfTickers(title),
            body:   stripEtfTickers((body).replace(/<[^>]+>/g, '').trim().slice(0, 400)),
        });
    };

    for (const n of general)      add(n.site,           n.title, n.text  ?? '', n.publishedDate);
    for (const n of macroBondNews) add(n.site,           n.title, n.text  ?? '', n.publishedDate);
    for (const r of rss)           add('Yahoo Finance',  r.title, r.body,        undefined); // RSS has no pubDate parsed

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

    // Derive an unambiguous market direction label from the S&P 500 change
    const spChange = indices.find(i => i.symbol === '^GSPC' || i.name?.includes('S&P'))?.changesPercentage ?? 0;
    const marketDirection =
        spChange >  0.5 ? `MARKETS ARE UP TODAY (+${spChange.toFixed(2)}%)` :
        spChange < -0.5 ? `MARKETS ARE DOWN TODAY (${spChange.toFixed(2)}%)` :
                          `MARKETS ARE ROUGHLY FLAT TODAY (${spChange.toFixed(2)}%)`;

    const articlesText = articles.map((a, i) =>
        `[${i + 1}] ${a.source.toUpperCase()}\nHeadline: ${a.title}\nContent: ${a.body || '(no excerpt)'}`
    ).join('\n\n');

    const watchlistText = Array.isArray(watchlist) && watchlist.length > 0
        ? watchlist.join(', ')
        : 'none';

    const prompt = `You are a market analyst writing a brief for a beginner investor.

⚠️ GROUND TRUTH — TRUST THESE LIVE NUMBERS ABOVE ALL ELSE:
${marketDirection}
Full indices: ${indicesText}
Macro signals: ${macroSnapshot}
Top moving sectors: ${topSectors}
Your first sentence MUST be consistent with this direction. If markets are down, do NOT say they rose.

ECONOMIC DATA RELEASED TODAY:
${economicEvents}

NEWS ARTICLES FROM THE LAST 24 HOURS (read to find WHY markets moved):
${articlesText}

USER'S WATCHLIST: ${watchlistText}

Write exactly 3 short sentences for a beginner investor:
1. What is happening in markets today and the main reason why — be specific (name the event: Fed speech, inflation data, tariffs, etc.)
2. Explain why it matters in plain English, as if talking to someone who has never invested
3. One specific thing worth watching today, ideally linked to their watchlist

Hard rules:
- The market direction in sentence 1 MUST match the live index numbers above
- Max 20 words per sentence
- No ETF ticker names (QQQ, SPY, TLT, etc.) — say "Nasdaq", "S&P 500", "bond market" instead
- No financial jargon without explanation in the same sentence
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
        return NextResponse.json({ brief: text, generatedAt: new Date().toISOString() });
    } catch (err) {
        console.error('morning-brief error:', err);
        return NextResponse.json({ brief: null, error: String(err) });
    }
}
