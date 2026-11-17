import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Shared Claude access for the MVP features.
 *
 * - Key: ANTHROPIC_API_KEY (Vercel) or AUGUR_ANTHROPIC_API_KEY (cloud dev env).
 * - Model: AUGUR_AI_MODEL, default Haiku 5.5 (cheapest current model).
 * - AUGUR_AI_MOCK=1 forces the deterministic fallbacks, so every screen can be
 *   built and tested without API credit.
 */

export const AI_MODEL = process.env.AUGUR_AI_MODEL || 'claude-haiku-5-5';

/** Basic web search variant: the dynamic-filtering one is not offered on Haiku. */
export const WEB_SEARCH_TOOL = { type: 'web_search_20250305', name: 'web_search', max_uses: 3 } as const;

let client: Anthropic | null = null;

export function isAiEnabled(): boolean {
    if (process.env.AUGUR_AI_MOCK === '1') return false;
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.AUGUR_ANTHROPIC_API_KEY);
}

export function getAiClient(): Anthropic {
    if (!isAiEnabled()) throw new Error('AI is disabled (no key or AUGUR_AI_MOCK=1)');
    client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.AUGUR_ANTHROPIC_API_KEY });
    return client;
}

/** Key, permission or billing problems: not worth counting as a failed explanation. */
export function isAccountProblem(error: unknown): boolean {
    if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return true;
    // An empty credit balance comes back as a plain 400
    return error instanceof Anthropic.BadRequestError && /credit balance/i.test(error.message);
}

/** Concatenates the text blocks of a response (server tool blocks are skipped). */
export function responseText(content: Anthropic.ContentBlock[]): string {
    return content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n')
        .trim();
}

/** Extracts the last JSON object from a model answer, tolerating code fences and prose around it. */
export function parseJsonObject<T>(raw: string): T | null {
    const stripped = raw.replace(/```(?:json)?/gi, '');
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
        return JSON.parse(stripped.slice(start, end + 1)) as T;
    } catch {
        return null;
    }
}

/** The wording rule every MVP prompt shares: information and education, never advice. */
export const NO_ADVICE_RULE =
    "Tu donnes de l'information et de la pédagogie, jamais de conseil en investissement : " +
    "pas de recommandation d'achat, de vente ou de conservation, pas d'objectif de cours de ta part, " +
    'pas de « il faut », pas de suggestion adaptée à la situation du lecteur.';
