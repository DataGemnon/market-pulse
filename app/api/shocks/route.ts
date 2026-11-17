import { NextResponse } from 'next/server';
import { isAiEnabled } from '@/lib/ai';
import { isStoreConfigured } from '@/lib/store';
import { listRecentShocks } from '@/lib/shocks/service';

export const dynamic = 'force-dynamic';

/** Market-wide shocks of the last 72 hours, with their explanation. Same for every user. */
export async function GET() {
    try {
        const shocks = await listRecentShocks();
        return NextResponse.json(
            { shocks, liveScan: isStoreConfigured(), aiEnabled: isAiEnabled() },
            { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } },
        );
    } catch (error) {
        console.error('shocks route error:', error);
        return NextResponse.json({ shocks: [], liveScan: false, aiEnabled: false }, { status: 500 });
    }
}
