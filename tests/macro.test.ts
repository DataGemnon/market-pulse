import { describe, expect, it } from 'vitest';
import { MACRO_CALENDAR } from '@/lib/macro/calendar';
import { computeSensitivity, reactionDate } from '@/lib/macro/reaction';

describe('macro reaction day', () => {
    const dates = ['2026-10-28', '2026-10-29', '2026-10-30'];

    it('prices an FOMC decision (18:00 UTC) the same day in New York, the next day in Paris', () => {
        const fomc = '2026-10-28T14:00:00-04:00';
        expect(reactionDate(fomc, 20 * 60, dates)).toBe('2026-10-28');
        expect(reactionDate(fomc, 16 * 60 + 30, dates)).toBe('2026-10-29');
    });

    it('prices the ECB (14:15 Frankfurt) the same day everywhere', () => {
        expect(reactionDate('2026-10-29T14:15:00+01:00', 16 * 60 + 30, dates)).toBe('2026-10-29');
    });
});

describe('computeSensitivity', () => {
    it('measures a stock that moves 3x more on CPI days', () => {
        const closes: { date: string; close: number }[] = [];
        let price = 100;
        const cpiDays = new Set(MACRO_CALENDAR.filter(e => e.type === 'CPI').map(e => e.at.slice(0, 10)));
        for (let d = new Date('2025-01-01T00:00:00Z'); d < new Date('2026-11-01T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
            if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
            const date = d.toISOString().slice(0, 10);
            const sign = d.getUTCDate() % 2 ? 1 : -1;
            price *= 1 + sign * (cpiDays.has(date) ? 0.03 : 0.01);
            closes.push({ date, close: price });
        }
        const past = MACRO_CALENDAR.filter(e => e.type === 'CPI' && e.at < '2026-11-01');
        const s = computeSensitivity(closes, past, 20 * 60)!;
        expect(s.events).toBe(past.length);
        expect(s.ratio).toBeGreaterThan(2.8);
        expect(s.last?.date).toBe('2026-10-14');
    });

    it('has no duplicate or malformed calendar entries', () => {
        const keys = MACRO_CALENDAR.map(e => `${e.type}${e.at}`);
        expect(new Set(keys).size).toBe(keys.length);
        expect(MACRO_CALENDAR.every(e => !Number.isNaN(Date.parse(e.at)))).toBe(true);
    });
});
