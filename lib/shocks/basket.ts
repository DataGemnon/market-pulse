import type { AssetSpec } from './detect';

/**
 * The multi-asset basket watched for market-wide shocks.
 * US ETFs cover 4am-8pm ET, the Xetra ETF the European session, FX and gold
 * nearly 24/5, bitcoin the weekends.
 */
export const SHOCK_BASKET: AssetSpec[] = [
    { symbol: 'SPY.US', label: 'S&P 500', kind: 'equity', minMovePct: 0.3, soloMovePct: 1.2 },
    { symbol: 'QQQ.US', label: 'Nasdaq 100', kind: 'equity', minMovePct: 0.3, soloMovePct: 1.2 },
    { symbol: 'EXW1.XETRA', label: 'Euro Stoxx 50', kind: 'equity', minMovePct: 0.3, soloMovePct: 1.2 },
    { symbol: 'EURUSD.FOREX', label: 'EUR/USD', kind: 'fx', minMovePct: 0.2, soloMovePct: 0.7 },
    { symbol: 'USDJPY.FOREX', label: 'USD/JPY', kind: 'fx', minMovePct: 0.2, soloMovePct: 0.8 },
    { symbol: 'XAUUSD.FOREX', label: 'Or', kind: 'commodity', minMovePct: 0.3, soloMovePct: 1.2 },
    { symbol: 'BTC-USD.CC', label: 'Bitcoin', kind: 'crypto', minMovePct: 1, soloMovePct: 4 },
];

/** Benchmark used to measure a stock's sensitivity during a shock. */
export function benchmarkFor(appSymbol: string): { symbol: string; label: string } {
    const isUS = !/\.[A-Za-z]{1,5}$/.test(appSymbol);
    return isUS ? { symbol: 'SPY.US', label: 'S&P 500' } : { symbol: 'EXW1.XETRA', label: 'Euro Stoxx 50' };
}
