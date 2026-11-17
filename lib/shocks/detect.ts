/**
 * Market shock detection on 1-minute price series. Pure functions, no I/O.
 *
 * Rule (calibrated on past shocks, see tests): an asset is "flagged" at minute t
 * when its 5-minute log return is above 4 standard deviations of its own 1-minute
 * returns over the previous hour (scaled to 5 minutes) AND above a minimum size.
 * A shock needs either two different assets flagged within 10 minutes (one feed
 * can freeze or glitch) or one asset moving more than its "solo" threshold.
 */

export type Bar = { t: number; close: number }; // t = unix seconds of the bar

export type AssetKind = 'equity' | 'fx' | 'commodity' | 'crypto';

export type AssetSpec = {
    symbol: string;      // EODHD ticker, e.g. SPY.US
    label: string;       // shown to users, e.g. "S&P 500"
    kind: AssetKind;
    minMovePct: number;  // ignore moves smaller than this, whatever the z-score
    soloMovePct: number; // a move this large is a shock on its own
};

export type AssetFlag = {
    symbol: string;
    label: string;
    t: number;
    movePct: number;
    zScore: number;
};

export type Shock = {
    id: string;
    startedAt: number;
    endedAt: number;
    assets: AssetFlag[]; // strongest flag per asset
    severity: 'modéré' | 'fort' | 'extrême';
};

export const DETECTION = {
    windowSec: 5 * 60,
    baselineSec: 60 * 60,
    minBaselineReturns: 30,
    zThreshold: 4,
    clusterSec: 10 * 60,
    minAssets: 2,
    // Flags within this delay after a shock started belong to that same shock
    mergeSec: 45 * 60,
} as const;

/** Last bar at or before `t` (bars sorted by time), or null. */
function priceAt(bars: Bar[], t: number, fromIndex: number): { price: number; index: number } | null {
    for (let i = fromIndex; i >= 0; i--) {
        if (bars[i].t <= t) return { price: bars[i].close, index: i };
    }
    return null;
}

function stdDev(values: number[]): number {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
}

/** Returns every minute where the asset made an abnormal 5-minute move. */
export function detectFlags(rawBars: Bar[], spec: AssetSpec): AssetFlag[] {
    const bars = [...rawBars].filter(b => b.close > 0).sort((a, b) => a.t - b.t);
    const flags: AssetFlag[] = [];

    for (let i = 1; i < bars.length; i++) {
        const now = bars[i];
        const past = priceAt(bars, now.t - DETECTION.windowSec, i - 1);
        // Stale data (gap longer than twice the window) says nothing about a sudden move
        if (!past || now.t - bars[past.index].t > 2 * DETECTION.windowSec) continue;

        const baseline: number[] = [];
        const baselineStart = now.t - DETECTION.windowSec - DETECTION.baselineSec;
        for (let j = past.index; j > 0 && bars[j].t >= baselineStart; j--) {
            baseline.push(Math.log(bars[j].close / bars[j - 1].close));
        }
        if (baseline.length < DETECTION.minBaselineReturns) continue;

        const move = Math.log(now.close / past.price);
        const sigma5 = stdDev(baseline) * Math.sqrt(DETECTION.windowSec / 60);
        const movePct = (Math.exp(move) - 1) * 100;
        const zScore = sigma5 > 0 ? move / sigma5 : 0;

        if (Math.abs(zScore) >= DETECTION.zThreshold && Math.abs(movePct) >= spec.minMovePct) {
            flags.push({ symbol: spec.symbol, label: spec.label, t: now.t, movePct, zScore });
        }
    }
    return flags;
}

function severityOf(assets: AssetFlag[], specs: Map<string, AssetSpec>): Shock['severity'] {
    const ratio = Math.max(...assets.map(a => Math.abs(a.movePct) / (specs.get(a.symbol)?.soloMovePct ?? 1)));
    if (ratio >= 2) return 'extrême';
    if (ratio >= 1 || assets.length >= 4) return 'fort';
    return 'modéré';
}

/** Groups flags from several assets into shocks. */
export function clusterShocks(flags: AssetFlag[], specList: AssetSpec[]): Shock[] {
    const specs = new Map(specList.map(s => [s.symbol, s]));
    const sorted = [...flags].sort((a, b) => a.t - b.t);
    const shocks: Shock[] = [];
    let current: AssetFlag[] = [];

    const isShock = (group: AssetFlag[]) => {
        const symbols = new Set(group.map(f => f.symbol));
        if (symbols.size >= DETECTION.minAssets) return true;
        return group.some(f => Math.abs(f.movePct) >= (specs.get(f.symbol)?.soloMovePct ?? Infinity));
    };

    const close = () => {
        if (current.length === 0 || !isShock(current)) return;
        const strongest = new Map<string, AssetFlag>();
        for (const flag of current) {
            const best = strongest.get(flag.symbol);
            if (!best || Math.abs(flag.zScore) > Math.abs(best.zScore)) strongest.set(flag.symbol, flag);
        }
        const assets = [...strongest.values()].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
        const startedAt = current[0].t;
        shocks.push({
            id: `shock-${new Date(startedAt * 1000).toISOString().slice(0, 16)}`,
            startedAt,
            endedAt: current[current.length - 1].t,
            assets,
            severity: severityOf(assets, specs),
        });
    };

    for (const flag of sorted) {
        if (current.length > 0 && isShock(current)) {
            // A confirmed shock absorbs follow-through flags while activity is continuous;
            // after a quiet gap, or once it is old, the next flags start a new shock
            const lastT = current[current.length - 1].t;
            if (flag.t - lastT > DETECTION.clusterSec || flag.t - current[0].t > DETECTION.mergeSec) {
                close();
                current = [];
            }
        } else {
            // Not confirmed yet: slide the window so only the last `clusterSec` count
            current = current.filter(f => flag.t - f.t <= DETECTION.clusterSec);
        }
        current.push(flag);
    }
    close();
    return shocks;
}

export function detectShocks(seriesBySymbol: Map<string, Bar[]>, specs: AssetSpec[]): Shock[] {
    const flags = specs.flatMap(spec => detectFlags(seriesBySymbol.get(spec.symbol) ?? [], spec));
    return clusterShocks(flags, specs);
}
