'use server';

import { getInternationalIndices } from '@/lib/market-data';
import { MarketIndex } from '@/types';

export async function getInternationalIndicesAction(): Promise<MarketIndex[]> {
    return getInternationalIndices();
}
