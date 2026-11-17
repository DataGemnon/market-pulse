import { describe, expect, it } from 'vitest';
import { computeBeta, readImpact, type DailyClose } from '@/lib/shocks/impact';

function series(returns: number[], start = 100): DailyClose[] {
    const out: DailyClose[] = [{ date: '2026-01-01', close: start }];
    returns.forEach((r, i) => {
        const d = new Date(Date.UTC(2026, 0, 2 + i)).toISOString().slice(0, 10);
        out.push({ date: d, close: out[out.length - 1].close * Math.exp(r) });
    });
    return out;
}

describe('computeBeta', () => {
    const bench = Array.from({ length: 120 }, (_, i) => Math.sin(i * 1.7) * 0.01);

    it('recovers a known beta', () => {
        const stock = bench.map((r, i) => 1.5 * r + Math.cos(i * 3.1) * 0.001);
        expect(computeBeta(series(stock), series(bench))).toBeCloseTo(1.5, 1);
    });

    it('needs enough shared dates', () => {
        expect(computeBeta(series(bench.slice(0, 20)), series(bench.slice(0, 20)))).toBeNull();
    });
});

describe('readImpact', () => {
    it('describes a stock that falls more than its beta implies, without advice', () => {
        const text = readImpact({
            symbol: 'NVDA', benchmark: 'S&P 500', beta: 1.8, benchmarkMovePct: -1.2,
            expectedMovePct: -2.16, dayChangePct: -6, benchmarkDayChangePct: -1.5,
        });
        expect(text).toContain('1,8 fois le S&P 500');
        expect(text).toContain('nettement moins bien');
        expect(text).not.toMatch(/achet|vend|conseil/i);
    });
});
