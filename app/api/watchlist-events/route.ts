import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getWatchlistEvents } from '@/lib/filings/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SYMBOL_RE = /^[A-Z0-9.\-]{1,20}$/i;

/** Official publications (SEC, AMF) of the last 30 days for the caller's watchlist. */
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!(await rateLimit(`watchlist-events:${ip}`, 30, 3600))) {
        return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
    }
    const body = (await req.json().catch(() => null)) as { symbols?: string[] } | null;
    const symbols = (body?.symbols ?? []).filter(s => typeof s === 'string' && SYMBOL_RE.test(s)).slice(0, 20);
    if (symbols.length === 0) return NextResponse.json({ events: [] });
    try {
        return NextResponse.json({ events: await getWatchlistEvents(symbols) });
    } catch (error) {
        console.error('watchlist events failed:', error);
        return NextResponse.json({ events: [] }, { status: 500 });
    }
}
