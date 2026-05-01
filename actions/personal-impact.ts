'use server';

import Anthropic from '@anthropic-ai/sdk';
import { StockQuote } from '@/types';

const anthropic = new Anthropic();

export interface PersonalImpactResult {
    brief: string;
    severity: 'positive' | 'negative' | 'mixed';
}

const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;

export async function getPersonalImpact(
    quotes: StockQuote[]
): Promise<PersonalImpactResult | null> {
    if (quotes.length === 0) return null;

    // Thresholds to trigger the card
    const STOCK_THRESHOLD = 2.5;
    const AVG_THRESHOLD   = 0.8;

    const bigMovers = quotes.filter(q => Math.abs(q.changesPercentage) >= STOCK_THRESHOLD);
    const avg = quotes.reduce((s, q) => s + q.changesPercentage, 0) / quotes.length;

    // Only generate if something significant happened
    if (bigMovers.length === 0 && Math.abs(avg) < AVG_THRESHOLD) return null;

    const severity: PersonalImpactResult['severity'] =
        avg > 0.5  ? 'positive' :
        avg < -0.5 ? 'negative' : 'mixed';

    // Summarise the watchlist for Claude
    const lines = quotes
        .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
        .map(q => `${q.symbol} (${pct(q.changesPercentage)})`)
        .join(', ');

    const prompt =
        `Today's moves in this investor's watchlist: ${lines}.\n` +
        `Write exactly 2 short sentences for this specific investor:\n` +
        `1. What happened in their portfolio today (plain English, specific numbers welcome).\n` +
        `2. What they should keep an eye on next.\n` +
        `Max 45 words total. No jargon. No buy/sell advice.`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 120,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
        });

        const brief = (msg.content[0] as { type: 'text'; text: string }).text.trim();
        return { brief, severity };
    } catch {
        return null;
    }
}
