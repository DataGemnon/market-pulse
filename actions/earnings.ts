'use server';

import { getUpcomingEarnings } from '@/lib/fmp';
import { UpcomingEarnings } from '@/types';

export async function getWatchlistEarningsAction(symbols: string[]): Promise<UpcomingEarnings[]> {
    return getUpcomingEarnings(symbols);
}
