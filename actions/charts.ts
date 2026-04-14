'use server';

import { getHistoricalChart, getSparklineData } from '@/lib/fmp';
import { HistoricalPrice } from '@/types';

export async function getChartDataAction(
    symbol: string,
    range: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'
): Promise<HistoricalPrice[]> {
    return getHistoricalChart(symbol, range);
}

export async function getSparklineAction(symbol: string): Promise<HistoricalPrice[]> {
    return getSparklineData(symbol);
}
