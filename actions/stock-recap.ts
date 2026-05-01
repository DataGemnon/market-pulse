'use server';

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RECAP_THRESHOLD = 1.5; // minimum % move to generate a recap

interface RecapInput {
    symbol: string;
    name: string;
    changesPercentage: number;
    headlines: string[];
}

async function generateRecap(input: RecapInput): Promise<string | null> {
    if (input.headlines.length === 0) return null;

    const direction = input.changesPercentage > 0 ? 'up' : 'down';
    const pct = Math.abs(input.changesPercentage).toFixed(1);
    const headlinesText = input.headlines.slice(0, 6).map(h => `- ${h}`).join('\n');

    const prompt = `${input.name} (${input.symbol}) is ${direction} ${pct}% today.

Headlines:
${headlinesText}

Write ONE factual sentence (max 15 words) stating the main reason it is moving today.
Rules:
- Start with the cause (e.g. "Beat Q3 earnings estimates..." or "Announced a merger with...")
- Do not use the words "investors", "the stock", or "shares"
- Do not include the percentage move
- No lead-in phrase, no punctuation at the start
- Return only the sentence, nothing else`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 80,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
        return text || null;
    } catch {
        return null;
    }
}

export async function getBatchStockRecaps(
    quotes: { symbol: string; name: string; changesPercentage: number }[],
    newsMap: Record<string, string[]>
): Promise<Record<string, string>> {
    // Only significant movers that have news headlines
    const movers = quotes
        .filter(q => Math.abs(q.changesPercentage) >= RECAP_THRESHOLD && (newsMap[q.symbol]?.length ?? 0) > 0)
        .slice(0, 5); // cap at 5 Claude calls per refresh

    if (movers.length === 0) return {};

    const results = await Promise.all(
        movers.map(q => generateRecap({
            symbol: q.symbol,
            name: q.name,
            changesPercentage: q.changesPercentage,
            headlines: newsMap[q.symbol] || [],
        }))
    );

    const recaps: Record<string, string> = {};
    movers.forEach((q, i) => {
        if (results[i]) recaps[q.symbol] = results[i]!;
    });
    return recaps;
}
