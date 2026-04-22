import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Temporary debug endpoint — remove after diagnosing the Claude issue.
// Visit /api/debug-claude to see available models and which one works.
export async function GET() {
    const key = process.env.ANTHROPIC_API_KEY;

    if (!key) {
        return NextResponse.json({ ok: false, error: 'ANTHROPIC_API_KEY is not set in environment' });
    }

    const client = new Anthropic({ apiKey: key });

    // Step 1: list available models on this API key
    let availableModels: string[] = [];
    try {
        const page = await client.models.list();
        availableModels = page.data.map((m: any) => m.id);
    } catch (listErr: any) {
        availableModels = [`(list failed: ${listErr?.message})`];
    }

    // Step 2: try to make a minimal message call with the best available model
    const candidates = [
        'claude-haiku-4-5',
        'claude-3-5-haiku-20241022',
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307',
    ];

    // Pick the first candidate that appears in the available list, or just try in order
    const preferredModel = availableModels.find(m =>
        candidates.some(c => m.includes('haiku') || m.includes('sonnet'))
    ) || candidates[0];

    let testResult: any = null;
    for (const model of candidates) {
        try {
            const msg = await client.messages.create({
                model,
                max_tokens: 20,
                messages: [{ role: 'user', content: 'Reply with just the word OK.' }],
            });
            const text = msg.content[0].type === 'text' ? msg.content[0].text : '(non-text)';
            testResult = { ok: true, workingModel: model, response: text };
            break;
        } catch (err: any) {
            testResult = { ok: false, triedModel: model, error: err?.message, status: err?.status };
            // continue to next candidate
        }
    }

    return NextResponse.json({ availableModels, testResult });
}
