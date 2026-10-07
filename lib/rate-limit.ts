import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Fixed-window rate limiter.
 *
 * Uses Upstash Redis (REST) when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
 * are set, so limits hold across every Vercel instance. Without them it falls back
 * to an in-memory counter, which only limits per instance (best effort).
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const memoryHits = new Map<string, { count: number; resetAt: number }>();

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    console.warn('Rate limiting is in-memory only. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for global limits.');
}

async function hitUpstash(key: string, windowSec: number): Promise<number> {
    const res = await fetch(`${UPSTASH_URL}/pipeline`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
            ['INCR', key],
            ['EXPIRE', key, String(windowSec), 'NX'],
        ]),
        cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Upstash error ${res.status}`);
    const [incr] = (await res.json()) as { result: number }[];
    return incr.result;
}

function hitMemory(key: string, windowSec: number): number {
    const now = Date.now();
    const entry = memoryHits.get(key);
    if (!entry || entry.resetAt <= now) {
        memoryHits.set(key, { count: 1, resetAt: now + windowSec * 1000 });
        return 1;
    }
    entry.count += 1;
    return entry.count;
}

/** Returns true when the call is allowed, false when the limit is exceeded. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
    const fullKey = `rl:${key}`;
    let count: number;
    try {
        count = UPSTASH_URL && UPSTASH_TOKEN
            ? await hitUpstash(fullKey, windowSec)
            : hitMemory(fullKey, windowSec);
    } catch (err) {
        // Redis outage: fall back to the local counter rather than failing open
        console.error('rateLimit store error, using in-memory fallback:', err);
        count = hitMemory(fullKey, windowSec);
    }
    return count <= limit;
}

/** Current Supabase user, or null when signed out or Supabase isn't configured. */
export async function getCurrentUser() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    } catch {
        return null;
    }
}

function getClientIp(req: NextRequest): string {
    return req.headers.get('x-real-ip')
        ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? 'unknown';
}

interface AiRouteLimits {
    route: string;
    anonPerHour: number;
    userPerHour: number;
}

/**
 * Rate-limits an AI route per signed-in user, or per IP for anonymous visitors.
 * Returns a 429 response to send back, or null when the call may proceed.
 */
export async function guardAiRoute(req: NextRequest, limits: AiRouteLimits): Promise<NextResponse | null> {
    const user = await getCurrentUser();
    const identity = user ? `user:${user.id}` : `ip:${getClientIp(req)}`;
    const limit = user ? limits.userPerHour : limits.anonPerHour;

    const allowed = await rateLimit(`ai:${limits.route}:${identity}`, limit, 3600);
    if (allowed) return null;

    return NextResponse.json(
        { error: 'Too many requests, please try again later.' },
        { status: 429, headers: { 'Retry-After': '3600' } },
    );
}
