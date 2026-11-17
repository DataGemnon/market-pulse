import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { detectShocks, detectFlags, type Bar } from '@/lib/shocks/detect';
import { SHOCK_BASKET } from '@/lib/shocks/basket';

function loadFixture(name: string): Map<string, Bar[]> {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', `${name}.json`), 'utf8')) as Record<string, [number, number][]>;
    return new Map(Object.entries(raw).map(([symbol, rows]) => [symbol, rows.map(([t, close]) => ({ t, close }))]));
}

const iso = (t: number) => new Date(t * 1000).toISOString().slice(0, 16);

describe('shock detection on real EODHD 1-minute data', () => {
    it('catches the tariff-pause post (2025-04-09, posted 17:18 UTC) within minutes', () => {
        const shocks = detectShocks(loadFixture('tariff-pause-2025-04-09'), SHOCK_BASKET);
        const hit = shocks.find(s => s.startedAt >= Date.UTC(2025, 3, 9, 17, 18) / 1000);
        expect(hit?.severity).toBe('extrême');
        expect(hit).toBeDefined();
        expect(hit!.startedAt - Date.UTC(2025, 3, 9, 17, 18) / 1000).toBeLessThanOrEqual(5 * 60);
        expect(hit!.assets.some(a => a.symbol === 'QQQ.US' && a.movePct > 0)).toBe(true);
    });

    it('catches the hot CPI print (2022-09-13, 12:30 UTC) in the same minutes', () => {
        const shocks = detectShocks(loadFixture('cpi-2022-09-13'), SHOCK_BASKET);
        const hit = shocks.find(s => Math.abs(s.startedAt - Date.UTC(2022, 8, 13, 12, 30) / 1000) <= 5 * 60);
        expect(hit).toBeDefined();
    });

    it('catches the report that Trump might fire Powell (2025-07-16, mid-session)', () => {
        const shocks = detectShocks(loadFixture('powell-report-2025-07-16'), SHOCK_BASKET);
        const hit = shocks.find(s => s.severity !== 'modéré');
        expect(hit).toBeDefined();
        expect(iso(hit!.startedAt)).toBe('2025-07-16T15:16');
        // dollar down, gold up, stocks down: the classic "Fed independence" reaction
        expect(hit!.assets.find(a => a.symbol === 'XAUUSD.FOREX')!.movePct).toBeGreaterThan(0);
        expect(hit!.assets.find(a => a.symbol === 'SPY.US')!.movePct).toBeLessThan(0);
    });

    it('stays quiet on an ordinary session (2025-08-27, 08:00-20:00 UTC)', () => {
        expect(detectShocks(loadFixture('calm-2025-08-27'), SHOCK_BASKET)).toEqual([]);
    });
});

describe('detectFlags', () => {
    const spec = SHOCK_BASKET[0];
    const flat = (n: number, start = 0): Bar[] =>
        Array.from({ length: n }, (_, i) => ({ t: start + i * 60, close: 100 + Math.sin(i) * 0.01 }));

    it('ignores a series without enough history', () => {
        expect(detectFlags(flat(20), spec)).toEqual([]);
    });

    it('flags a sudden 1% drop after a quiet hour', () => {
        const bars = flat(70);
        const last = bars[bars.length - 1];
        bars.push({ t: last.t + 60, close: 99.5 }, { t: last.t + 120, close: 99 });
        const flags = detectFlags(bars, spec);
        expect(flags.length).toBeGreaterThan(0);
        expect(flags[0].movePct).toBeLessThan(-0.3);
    });

    it('does not compare across a data gap', () => {
        const bars = [...flat(70), { t: 70 * 60 + 3600, close: 90 }];
        expect(detectFlags(bars, spec)).toEqual([]);
    });
});
