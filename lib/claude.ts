import Anthropic from '@anthropic-ai/sdk';

function getClient() {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) {
        throw new Error('ANTHROPIC_API_KEY is missing');
    }
    return new Anthropic({ apiKey: key });
}

export interface StockNewsSummary {
    symbol: string;
    summary: string;
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
}

export async function summarizeStockNews(symbol: string, articles: { title: string; source: string; publishedDate: string }[]): Promise<StockNewsSummary> {
    if (articles.length === 0) {
        return {
            symbol,
            summary: 'No recent news available.',
            sentiment: 'NEUTRAL',
        };
    }

    // Deduplicate articles by title similarity (simple check) or just pass top N
    // For now, let's pass the top 10 articles to Claude
    const recentArticles = articles.slice(0, 10);

    const articlesText = recentArticles.map(a => `- [${a.source}] ${a.title}`).join('\n');

    const prompt = `You are a financial news analyst. Summarize the key story for ${symbol} based on these headlines.

Headlines:
${articlesText}

Respond with ONLY a valid JSON object — no markdown, no code fences, no explanation:
{"summary":"One concise sentence (max 20 words) describing the main story.","sentiment":"POSITIVE"}

Rules:
- sentiment must be exactly one of: POSITIVE, NEUTRAL, NEGATIVE
- Do not mention ETF ticker symbols (QQQ, SPY, TLT, GLD, etc.) — say "Nasdaq", "S&P 500", "bond market", "gold" instead
- Write for a beginner investor, plain English only`;

    try {
        const msg = await getClient().messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 256,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

        // Strip markdown code fences if present
        const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error(`No JSON found: ${raw.slice(0, 100)}`);

        const result = JSON.parse(jsonMatch[0]);
        return { symbol, summary: result.summary, sentiment: result.sentiment };

    } catch (error) {
        console.error('Error calling Claude API for stock summary:', error);
        return { symbol, summary: 'Unable to analyze news at this time.', sentiment: 'NEUTRAL' };
    }
}

import { GeneralNewsArticle, EconomicEvent, MarketCommentary } from '@/types';

export interface MarketImpactAnalysis {
    summary: string;
    market_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    key_drivers: {
        title: string;
        impact_level: 'HIGH' | 'MEDIUM' | 'LOW';
        category: 'GEOPOLITICS' | 'ECONOMY' | 'POLICY' | 'MARKET';
        description: string;
    }[];
}

export async function analyzeMarketImpact(
    news: GeneralNewsArticle[],
    events: EconomicEvent[],
    extraArticles: { title: string; body: string }[] = []
): Promise<MarketImpactAnalysis> {
    const highImpactEvents = events.filter(e => e.impact === 'High' || e.impact === 'Medium').slice(0, 5);

    const eventsText = highImpactEvents.length > 0
        ? highImpactEvents.map(e => {
            const unit = e.unit || '';
            if (e.actual !== null && e.estimate !== null) {
                const beat = (e.actual as number) > (e.estimate as number) ? 'BEAT' : 'MISSED';
                return `[${e.impact.toUpperCase()}] ${e.event}: Actual ${e.actual}${unit} vs Expected ${e.estimate}${unit} — ${beat}`;
            }
            return `[${e.impact.toUpperCase()}] ${e.event}${e.actual !== null ? `: ${e.actual}${unit}` : ' — upcoming'}`;
          }).join('\n')
        : 'No major economic releases today';

    // Build article feed: FMP news WITH full text content + any extra articles (RSS etc.)
    const allArticles = [
        ...news.slice(0, 15).map(n => ({ title: n.title, body: (n.text || '').replace(/<[^>]+>/g, '').trim().slice(0, 350), source: n.site })),
        ...extraArticles.slice(0, 8).map(a => ({ ...a, source: 'Yahoo Finance' })),
    ];
    const articlesText = allArticles
        .filter(a => a.title)
        .map((a, i) => `[${i + 1}] ${a.source.toUpperCase()}\n${a.title}\n${a.body || '(no excerpt)'}`)
        .join('\n\n');

    const prompt = `You are explaining today's financial markets to someone who never reads financial news.

Your job: read the articles below and identify 2-3 REAL, CONCRETE news stories driving markets today.

✅ GOOD examples of what you should write:
- title: "Trump visit to China disappoints investors", description: "Investors hoped for a trade deal but no agreement was reached, keeping tariff uncertainty high."
- title: "Inflation stays stubbornly high", description: "US prices rose more than expected, making it less likely the Fed will cut interest rates soon."
- title: "Fed Chair signals no rate cuts", description: "Jerome Powell said the central bank needs more proof inflation is falling before lowering rates."
- title: "Strong jobs data boosts confidence", description: "More Americans found work than expected, suggesting the economy is holding up well."

❌ BAD examples — never write like this:
- "Small-cap to large-cap valuation gap closure"
- "Market breadth concerns and mega-cap rotation"
- "Equity risk premium compression"
- "Mixed performance across equity indices"

ECONOMIC DATA RELEASED TODAY:
${eventsText}

NEWS ARTICLES (read these to find the real story):
${articlesText}

Respond with ONLY valid JSON, no markdown:
{"summary":"One plain sentence naming the biggest story today (max 20 words).","market_sentiment":"BEARISH","key_drivers":[{"title":"Short plain-English title (max 8 words)","impact_level":"HIGH","category":"POLICY","description":"One sentence explaining what happened and why it matters, in plain English. Max 25 words."},{"title":"Second story title","impact_level":"MEDIUM","category":"ECONOMY","description":"Plain explanation."}]}

Rules:
- market_sentiment: BULLISH, BEARISH, or NEUTRAL
- impact_level: HIGH, MEDIUM, or LOW
- category: GEOPOLITICS, ECONOMY, POLICY, or MARKET
- 2 to 3 key_drivers
- No ETF ticker names (QQQ, SPY, TLT…) — say "Nasdaq", "S&P 500", "bond market"
- No financial jargon — write as if talking to a friend
- Titles must name the actual event, not an abstract concept
- Raw JSON only`;

    try {
        const msg = await getClient().messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });

        if (msg.stop_reason === 'max_tokens') {
            console.warn('analyzeMarketImpact: response was truncated at max_tokens');
        }

        const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

        // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
        const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

        // Extract the first JSON object
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error(`No JSON object found in response: ${raw.slice(0, 200)}`);

        return JSON.parse(jsonMatch[0]);

    } catch (error) {
        console.error('Error analyzing market impact:', error);
        return {
            summary: 'Unable to analyze market impact at this time.',
            market_sentiment: 'NEUTRAL',
            key_drivers: []
        };
    }
}

export async function extractMarketCommentary(news: GeneralNewsArticle[]): Promise<MarketCommentary[]> {
    const recentNews = news.slice(0, 25);

    const newsContext = recentNews.map(n =>
        `- [${n.publishedDate}] [${n.site}] ${n.title} | ${(n.text || '').substring(0, 120)}`
    ).join('\n');

    const prompt = `
You are a financial media analyst. Scan the following news headlines and summaries.
Extract notable opinions, quotes, or commentary from prominent figures — CEOs, fund managers, economists, central bankers, Fed officials, politicians, or well-known analysts.

Look for articles where a specific named person expresses a view about a stock, sector, asset class, region, or the overall market. Examples: "Jamie Dimon warns about recession risks", "Cathie Wood doubles down on Tesla", "Fed Chair Powell signals patience on rate cuts".

For each notable opinion found, return:
- personName: The person's full name
- personTitle: Their role (e.g., "CEO of JPMorgan", "Fed Chair", "ARK Invest CEO")
- opinion: A 1-sentence summary of their view
- subject: What they're commenting on (a ticker symbol like "AAPL", a sector like "Technology", or "Market" / "Economy")
- sentiment: BULLISH, BEARISH, or NEUTRAL
- source: The news source name
- date: The article date (YYYY-MM-DD format)

Return ONLY a JSON array. If no notable opinions are found, return an empty array [].
Do not include generic corporate announcements — only strong personal opinions or forecasts.

News to analyze:
${newsContext}
`;

    try {
        const msg = await getClient().messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 800,
            temperature: 0,
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';

        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : '[]';

        return JSON.parse(jsonStr);

    } catch (error) {
        console.error('Error extracting market commentary:', error);
        return [];
    }
}
