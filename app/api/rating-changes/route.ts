import { NextResponse } from 'next/server';
import { getRatingMoves } from '@/lib/ratings/service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Large caps (S&P 500, ~SBF 120) moving abnormally today on a broker rating change. */
export async function GET() {
    try {
        return NextResponse.json(
            { moves: await getRatingMoves() },
            { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' } },
        );
    } catch (error) {
        console.error('rating changes failed:', error);
        return NextResponse.json({ moves: [] }, { status: 500 });
    }
}
