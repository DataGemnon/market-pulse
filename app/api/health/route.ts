import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    const results: Record<string, string> = {};

    // Check env vars
    results.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
        ? `set (starts with ${process.env.ANTHROPIC_API_KEY.slice(0, 14)}...)`
        : 'MISSING';
    results.FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY ? 'set' : 'MISSING';

    // Test Claude
    try {
        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const msg = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say OK' }],
        });
        results.claude = `OK: ${(msg.content[0] as { type: string; text: string }).text}`;
    } catch (e: unknown) {
        results.claude = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Test FMP
    try {
        const key = process.env.NEXT_PUBLIC_FMP_API_KEY;
        const res = await fetch(`https://financialmodelingprep.com/api/v3/quote/AAPL?apikey=${key}`);
        const data = await res.json();
        results.fmp = Array.isArray(data) && data.length > 0
            ? `OK: AAPL = $${data[0].price}`
            : `Unexpected: ${JSON.stringify(data).slice(0, 80)}`;
    } catch (e: unknown) {
        results.fmp = `FAIL: ${e instanceof Error ? e.message : String(e)}`;
    }

    return NextResponse.json(results);
}
