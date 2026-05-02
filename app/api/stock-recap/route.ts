import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { StockQuote } from '@/types';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const THRESHOLD = 1.5;

async function generateRecap(
    quote: StockQuote,
    headlines: string[]
): Promise<string | null> {
    if (headlines.length === 0) return null;
    const direction = quote.changesPercentage > 0 ? 'up' : 'down';
    const pct = Math.abs(quote.changesPercentage).toFixed(1);
    const prompt =
        `${quote.name} (${quote.symbol}) is ${direction} ${pct}% today.\n` +
        `Headlines: ${headlines.slice(0, 3).map(h => `"${h}"`).join('; ')}\n` +
        `Write ONE plain-English sentence (max 15 words) explaining why. No jargon, no advice.`;
    const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 60,
        temperature: 0.1,
        messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
}

export async function POST(req: NextRequest) {
    const { quotes, newsMap }: { quotes: StockQuote[]; newsMap: Record<string, string[]> } = await req.json();
    if (!Array.isArray(quotes)) return NextResponse.json({});

    const movers = quotes
        .filter(q => Math.abs(q.changesPercentage) >= THRESHOLD && (newsMap[q.symbol]?.length ?? 0) > 0)
        .slice(0, 5);

    const entries = await Promise.all(
        movers.map(async (q) => {
            try {
                const recap = await generateRecap(q, newsMap[q.symbol] || []);
                return recap ? [q.symbol, recap] as [string, string] : null;
            } catch {
                return null;
            }
        })
    );
    return NextResponse.json(Object.fromEntries(entries.filter((e): e is [string, string] => e !== null)));
}
