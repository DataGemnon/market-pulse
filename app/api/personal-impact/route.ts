import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { StockQuote } from '@/types';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
    const { quotes }: { quotes: StockQuote[] } = await req.json();
    if (!Array.isArray(quotes) || quotes.length === 0) return NextResponse.json(null);

    const STOCK_THRESHOLD = 2.5;
    const AVG_THRESHOLD = 0.8;
    const bigMovers = quotes.filter(q => Math.abs(q.changesPercentage) >= STOCK_THRESHOLD);
    const avg = quotes.reduce((s, q) => s + q.changesPercentage, 0) / quotes.length;

    if (bigMovers.length === 0 && Math.abs(avg) < AVG_THRESHOLD) return NextResponse.json(null);

    const severity = avg > 0.5 ? 'positive' : avg < -0.5 ? 'negative' : 'mixed';
    const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
    const lines = quotes
        .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
        .map(q => `${q.symbol} (${pct(q.changesPercentage)})`)
        .join(', ');

    const prompt =
        `Today's moves in this investor's watchlist: ${lines}.\n` +
        `Write exactly 2 short sentences:\n` +
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
        const brief = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
        if (!brief) return NextResponse.json(null);
        return NextResponse.json({ brief, severity });
    } catch (err) {
        console.error('personal-impact route error:', err);
        return NextResponse.json(null);
    }
}
