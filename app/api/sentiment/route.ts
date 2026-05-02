import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AnalystConsensus } from '@/types';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summariseOne(c: AnalystConsensus): Promise<string> {
    const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell;
    if (total === 0) return '';
    const prompt =
        `Analyst ratings for ${c.symbol}: ${c.strongBuy} strong buy, ${c.buy} buy, ${c.hold} hold, ${c.sell} sell, ${c.strongSell} strong sell.\n` +
        `Write ONE plain-English sentence (max 15 words) summarising analyst opinion. No jargon, no advice.`;
    const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 60,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
    });
    return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
}

export async function POST(req: NextRequest) {
    const { consensus }: { consensus: AnalystConsensus[] } = await req.json();
    if (!Array.isArray(consensus) || consensus.length === 0) return NextResponse.json({});

    const subset = consensus.slice(0, 6);
    const entries = await Promise.all(
        subset.map(async (c) => {
            try {
                const text = await summariseOne(c);
                return [c.symbol, text] as [string, string];
            } catch {
                return [c.symbol, ''] as [string, string];
            }
        })
    );
    return NextResponse.json(Object.fromEntries(entries.filter(([, v]) => v)));
}
