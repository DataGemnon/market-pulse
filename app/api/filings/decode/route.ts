import { NextRequest, NextResponse } from 'next/server';
import type Anthropic from '@anthropic-ai/sdk';
import { unstable_cache } from 'next/cache';
import { AI_MODEL, NO_ADVICE_RULE, getAiClient, isAccountProblem, isAiEnabled, parseJsonObject, responseText } from '@/lib/ai';
import { guardAiRoute } from '@/lib/rate-limit';
import { SEC_FETCH_HEADERS, isOfficialDocUrl } from '@/lib/filings/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// About 15k tokens: the first part of a 10-Q holds the statements and the
// management discussion; the model is told when the text was cut.
const MAX_TEXT_CHARS = 60_000;

export type DecodedFiling = {
    status: 'ok' | 'ai_unavailable' | 'error';
    summary: string;
    keyPoints: string[];
    whyItMatters: string;
};

const unavailable = (status: DecodedFiling['status']): DecodedFiling => ({ status, summary: '', keyPoints: [], whyItMatters: '' });

function htmlToText(html: string): string {
    return html
        .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&#\d+;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

async function documentContent(url: string): Promise<Anthropic.ContentBlockParam> {
    if (/\.pdf($|\?)/i.test(url)) return { type: 'document', source: { type: 'url', url } };
    const res = await fetch(url, { headers: SEC_FETCH_HEADERS });
    if (!res.ok) throw new Error(`document ${res.status}`);
    const text = htmlToText(await res.text());
    const cut = text.length > MAX_TEXT_CHARS;
    return { type: 'text', text: `${cut ? '[Document tronqué : seul le début est fourni]\n' : ''}${text.slice(0, MAX_TEXT_CHARS)}` };
}

async function decode(url: string, symbol: string, title: string): Promise<DecodedFiling> {
    const prompt = `Voici une publication officielle de la société ${symbol} (« ${title} »).
Explique-la en français à un investisseur particulier qui découvre la finance :
- "summary" : ce qui a été publié, en 2 phrases, avec les chiffres clés exacts du document.
- "keyPoints" : 3 à 5 points factuels tirés du document (chiffres, dates, noms).
- "whyItMatters" : 2 phrases sur pourquoi ce type d'information peut compter pour le cours, de façon générale.
${NO_ADVICE_RULE}
N'utilise que le contenu du document. Si une information manque, ne l'invente pas.
Réponds uniquement avec un objet JSON {"summary":"...","keyPoints":["..."],"whyItMatters":"..."}.`;

    const response = await getAiClient().messages.create({
        model: AI_MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: [await documentContent(url), { type: 'text', text: prompt }] }],
    });
    const parsed = parseJsonObject<Partial<DecodedFiling>>(responseText(response.content));
    if (!parsed?.summary) throw new Error('unparseable answer');
    return {
        status: 'ok',
        summary: String(parsed.summary),
        keyPoints: (Array.isArray(parsed.keyPoints) ? parsed.keyPoints : []).map(String).slice(0, 5),
        whyItMatters: String(parsed.whyItMatters ?? ''),
    };
}

export async function POST(req: NextRequest) {
    const body = (await req.json().catch(() => null)) as { url?: string; symbol?: string; title?: string } | null;
    const url = body?.url ?? '';
    if (!isOfficialDocUrl(url)) return NextResponse.json({ error: 'Document non autorisé' }, { status: 400 });
    if (!isAiEnabled()) return NextResponse.json(unavailable('ai_unavailable'));

    const limited = await guardAiRoute(req, { route: 'filing-decode', anonPerHour: 10, userPerHour: 40 });
    if (limited) return limited;

    const symbol = String(body?.symbol ?? '').slice(0, 20);
    const title = String(body?.title ?? '').slice(0, 200);
    try {
        // One decoding per document for everyone; failures are not cached (they throw)
        const decoded = await unstable_cache(() => decode(url, symbol, title), ['filing-decode-v1', url], { revalidate: 30 * 86400 })();
        return NextResponse.json(decoded);
    } catch (error) {
        console.error('filing decode failed:', error);
        return NextResponse.json(unavailable(isAccountProblem(error) ? 'ai_unavailable' : 'error'));
    }
}
