'use server';

import { getInternationalIndices } from '@/lib/fmp';
import { MarketIndex } from '@/types';

export async function getInternationalIndicesAction(): Promise<MarketIndex[]> {
    return getInternationalIndices();
}
