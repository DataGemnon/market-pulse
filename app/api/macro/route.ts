import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { getDailyCloses } from '@/lib/prices';
import { MACRO_CALENDAR, MACRO_INFO, type MacroType } from '@/lib/macro/calendar';
import { computeSensitivity, marketCloseUtcMinutes, readSensitivity } from '@/lib/macro/reaction';

export const dynamic = 'force-dynamic';

const SYMBOL_RE = /^[A-Z0-9^.\-]{1,20}$/i;
const UPCOMING_DAYS = 45;
const HISTORY_DAYS = 2 * 365;

/** Upcoming macro events, each with how the caller's stocks usually react on such days. */
export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!(await rateLimit(`macro:${ip}`, 30, 3600))) return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });

    const body = (await req.json().catch(() => null)) as { symbols?: string[] } | null;
    const symbols = (body?.symbols ?? []).filter(s => typeof s === 'string' && SYMBOL_RE.test(s)).slice(0, 15);

    const now = Date.now();
    const upcoming = MACRO_CALENDAR
        .filter(e => {
            const t = Date.parse(e.at);
            return t > now - 12 * 3600 * 1000 && t < now + UPCOMING_DAYS * 86400 * 1000;
        })
        .sort((a, b) => a.at.localeCompare(b.at));
    const types = [...new Set(upcoming.map(e => e.type))] as MacroType[];

    const closes = await Promise.all(symbols.map(s => getDailyCloses(s, HISTORY_DAYS)));
    const sensitivity = Object.fromEntries(types.map(type => {
        const past = MACRO_CALENDAR.filter(e => e.type === type && Date.parse(e.at) < now);
        return [type, symbols.map((symbol, i) => {
            const s = computeSensitivity(closes[i], past, marketCloseUtcMinutes(symbol));
            return { symbol, ratio: s?.ratio ?? null, last: s?.last ?? null, reading: readSensitivity(symbol, s) };
        })];
    }));

    return NextResponse.json({
        events: upcoming.map(e => ({ ...e, ...MACRO_INFO[e.type] })),
        sensitivity,
    });
}
