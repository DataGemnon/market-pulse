'use server';

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface DiscoveryResult {
    symbol: string;
    name: string;
    what: string; // what the company does, plain English ≤12 words
    fit: string;  // why it matches the query, plain English ≤12 words
}

export async function discoverStocks(query: string): Promise<DiscoveryResult[]> {
    if (!query.trim()) return [];

    const prompt = `A beginner investor wants to invest in: "${query.trim()}"

Return a JSON array of exactly 4 publicly-traded companies most relevant to this theme.
For each company provide:
- "symbol": the NYSE or NASDAQ ticker symbol
- "name": the company's full name
- "what": ONE sentence (max 12 words) explaining what the company does, in plain English for someone with zero financial knowledge
- "fit": ONE sentence (max 12 words) explaining why this company is relevant to "${query.trim()}"

Rules:
- Only include real, currently-traded stocks on major US exchanges
- Prefer large, well-known companies (avoid micro-caps or obscure names)
- Vary the selection — don't just pick the 4 biggest; include at least one less obvious pick
- Absolutely no financial jargon in "what" or "fit"
- Return ONLY valid JSON — no markdown, no explanation, no code blocks
- If the query is too vague or not investment-related, return an empty array []

JSON format:
[{"symbol":"EXAMPLE","name":"Example Corp","what":"Makes X and sells Y.","fit":"Directly benefits from growing Z."}]`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 700,
            temperature: 0,
            messages: [{ role: 'user', content: prompt }],
        });

        const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';

        // Strip markdown code fences if present
        const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim();

        const parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .filter((r): r is DiscoveryResult =>
                typeof r.symbol === 'string' &&
                typeof r.name === 'string' &&
                typeof r.what === 'string' &&
                typeof r.fit === 'string'
            )
            .slice(0, 5);
    } catch {
        return [];
    }
}
