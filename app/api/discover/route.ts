import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
    const { query } = await req.json();
    if (!query?.trim()) return NextResponse.json([]);

    const prompt = `A beginner investor wants to invest in: "${query.trim()}"

Return a JSON array of exactly 4 publicly-traded companies most relevant to this theme.
For each company provide:
- "symbol": the NYSE or NASDAQ ticker symbol
- "name": the company's full name
- "what": ONE sentence (max 12 words) explaining what the company does, in plain English
- "fit": ONE sentence (max 12 words) explaining why this company fits "${query.trim()}"

Rules:
- Only real, currently-traded stocks on major US exchanges
- Prefer large well-known companies
- No financial jargon
- Return ONLY valid JSON, no markdown or explanation
- If not investment-related return []

JSON format:
[{"symbol":"EXAMPLE","name":"Example Corp","what":"Makes X.","fit":"Benefits from Z."}]`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 700,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });
        const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '[]';
        const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();
        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) return NextResponse.json([]);
        return NextResponse.json(parsed.slice(0, 5));
    } catch (err) {
        console.error('discover route error:', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
