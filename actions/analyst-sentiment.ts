'use server';

import Anthropic from '@anthropic-ai/sdk';
import type { AnalystConsensus } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateSummary(c: AnalystConsensus): Promise<string | null> {
    const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell;
    if (total === 0) return null;

    const prompt = `${total} Wall Street analysts cover ${c.symbol}: ${c.strongBuy} Strong Buy, ${c.buy} Buy, ${c.hold} Hold, ${c.sell} Sell, ${c.strongSell} Strong Sell.

Write ONE plain-English sentence (max 12 words) summarising what analysts collectively think.
Rules:
- Simple language for a beginner investor
- Do not use "investors", "shares", or "the stock"
- Do not include percentages or numbers
- Return only the sentence, nothing else`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 60,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
        return text || null;
    } catch {
        return null;
    }
}

export async function getBatchSentimentSummaries(
    consensus: AnalystConsensus[]
): Promise<Record<string, string>> {
    const valid = consensus
        .filter(c => c.strongBuy + c.buy + c.hold + c.sell + c.strongSell > 0)
        .slice(0, 6); // cap API calls

    if (valid.length === 0) return {};

    const results = await Promise.all(valid.map(generateSummary));

    const out: Record<string, string> = {};
    valid.forEach((c, i) => { if (results[i]) out[c.symbol] = results[i]!; });
    return out;
}
