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

    const articlesText = recentArticles.map(a => `- [${a.source}] ${a.title} (${a.publishedDate})`).join('\n');

    const prompt = `
You are a financial news analyst. I will provide you with a list of recent news headlines for the stock "${symbol}".
Your task is to:
1. Identify the main story or theme driving the news.
2. Synthesize these headlines into a SINGLE, concise headline summary (max 20 words).
3. Determine the overall sentiment of this news for the stock: POSITIVE, NEUTRAL, or NEGATIVE.

If the news is mixed, determine the dominant sentiment.
If there are no significant stories, return a neutral summary.

Format your response exactly as a JSON object:
{
  "summary": "Your concise headline here",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE"
}

News Headlines:
${articlesText}
`;

    try {
        const msg = await getClient().messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 150,
            temperature: 0,
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';

        // Attempt to parse JSON
        try {
            const result = JSON.parse(content);
            return {
                symbol,
                summary: result.summary,
                sentiment: result.sentiment
            };
        } catch (e) {
            // Fallback if JSON parsing fails (Claude usually follows instructions but just in case)
            console.error('Failed to parse Claude response:', content);
            return {
                symbol,
                summary: content.substring(0, 100) + '...', // Fallback
                sentiment: 'NEUTRAL'
            };
        }

    } catch (error) {
        console.error('Error calling Claude API:', error);
        return {
            symbol,
            summary: 'Unable to analyze news at this time.',
            sentiment: 'NEUTRAL',
        };
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

export async function analyzeMarketImpact(news: GeneralNewsArticle[], events: EconomicEvent[]): Promise<MarketImpactAnalysis> {
    const highImpactEvents = events.filter(e => e.impact === 'High' || e.impact === 'Medium').slice(0, 5);
    const recentNews = news.slice(0, 10);

    const dataContext = `
    ECONOMIC EVENTS (Recent/Upcoming):
    ${highImpactEvents.map(e => `- [${e.country}] ${e.event}: Actual=${e.actual}, Est=${e.estimate}, Impact=${e.impact}`).join('\n')}

    GENERAL NEWS HEADLINES:
    ${recentNews.map(n => `- [${n.publishedDate}] ${n.title}`).join('\n')}
    `;

    const prompt = `
    You are a senior Wall Street strategist. Your job is to tell a portfolio manager what SINGLE story is driving the market right now.
    
    Analyze the provided news and economic data.
    Identify the "Narrative of the Day" - the one dominant theme moving stocks (e.g., "Fed Rate Cut Hopes", "Escalating Middle East Tensions", "Tech Earnings Miss").
    
    Then identify 2-3 supporting factors.

    Output a JSON object with this structure:
    {
      "summary": "A punchy, professional 1-sentence summary of the market's main focus.",
      "market_sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
      "key_drivers": [
        {
          "title": "The Main Driver (The 'Narrative of the Day')",
          "impact_level": "HIGH",
          "category": "GEOPOLITICS" | "ECONOMY" | "POLICY" | "MARKET",
          "description": "Why this is the #1 story today."
        },
        {
          "title": "Supporting Factor 1",
          "impact_level": "MEDIUM" | "HIGH",
          "category": "...",
          "description": "Brief explanation."
        }
      ]
    }

    Data to Analyze:
    ${dataContext}
    `;

    try {
        const msg = await getClient().messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 400,
            temperature: 0,
            messages: [
                { role: 'user', content: prompt }
            ]
        });

        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';

        // Find JSON in content (sometimes Claude adds preamble)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;

        return JSON.parse(jsonStr);

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
            model: 'claude-3-5-haiku-20241022',
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
