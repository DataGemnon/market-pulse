import { NextRequest, NextResponse } from 'next/server';
import { scanMarket } from '@/lib/shocks/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Called every minute by Supabase pg_cron (see supabase/mvp.sql).
 * Protected by CRON_SECRET when it is set. Even unprotected it is cheap to call:
 * it samples at most once per 50 s and explains each shock at most 3 times.
 */
export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    try {
        return NextResponse.json(await scanMarket());
    } catch (error) {
        console.error('market scan failed:', error);
        return NextResponse.json({ error: 'scan failed' }, { status: 500 });
    }
}
