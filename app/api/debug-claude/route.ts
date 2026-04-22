import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Temporary debug endpoint — remove after diagnosing the Claude issue.
// Visit /api/debug-claude to see if the API key + model work.
export async function GET() {
    const key = process.env.ANTHROPIC_API_KEY;

    if (!key) {
        return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY is not set in environment' });
    }

    try {
        const client = new Anthropic({ apiKey: key });
        const msg = await client.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 20,
            messages: [{ role: 'user', content: 'Reply with just the word OK.' }],
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '(non-text response)';
        return NextResponse.json({ ok: true, response: text, model: msg.model });
    } catch (err: any) {
        return NextResponse.json({
            ok: false,
            error: err?.message || String(err),
            status: err?.status,
            errorType: err?.constructor?.name,
        });
    }
}
