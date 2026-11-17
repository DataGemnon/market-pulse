import type { MacroEvent } from './calendar';

/**
 * How much a stock usually moves on a given kind of macro day, from daily
 * closes. Pure functions.
 */

export type DailyClose = { date: string; close: number };

export type MacroSensitivity = {
    events: number;          // event days found in the price history
    eventAvgAbsPct: number;  // average absolute move on those days
    normalAvgAbsPct: number; // average absolute move on all other days
    ratio: number;           // > 1: the stock moves more than usual on these days
    last: { date: string; movePct: number } | null;
};

/** Market close in UTC minutes; an event after the close is priced the next session. */
export function marketCloseUtcMinutes(appSymbol: string): number {
    return /\.[A-Za-z]{1,5}$/.test(appSymbol) ? 16 * 60 + 30 : 20 * 60;
}

/** The session (YYYY-MM-DD) whose close-to-close return captures the event. */
export function reactionDate(eventAt: string, closeUtcMinutes: number, tradingDates: string[]): string | null {
    const at = new Date(eventAt);
    const day = at.toISOString().slice(0, 10);
    const minutes = at.getUTCHours() * 60 + at.getUTCMinutes();
    const sameDay = minutes < closeUtcMinutes;
    return tradingDates.find(date => (sameDay ? date >= day : date > day)) ?? null;
}

export function computeSensitivity(closes: DailyClose[], events: MacroEvent[], closeUtcMinutes: number): MacroSensitivity | null {
    const sorted = [...closes].filter(c => c.close > 0).sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length < 60) return null;
    const returnByDate = new Map<string, number>();
    for (let i = 1; i < sorted.length; i++) {
        returnByDate.set(sorted[i].date, (sorted[i].close / sorted[i - 1].close - 1) * 100);
    }
    const dates = [...returnByDate.keys()];
    const lastDate = dates[dates.length - 1];
    const eventDates = new Set<string>();
    for (const event of events) {
        if (event.at.slice(0, 10) < dates[0]) continue;
        const date = reactionDate(event.at, closeUtcMinutes, dates);
        // Ignore events past the end of the history (reactionDate would point to "next available")
        if (date && date <= lastDate && new Date(event.at) < new Date(`${lastDate}T23:59:59Z`)) eventDates.add(date);
    }
    if (eventDates.size < 3) return null;

    let eventSum = 0;
    let normalSum = 0;
    let normalCount = 0;
    for (const [date, r] of returnByDate) {
        if (eventDates.has(date)) eventSum += Math.abs(r);
        else { normalSum += Math.abs(r); normalCount++; }
    }
    const eventAvgAbsPct = eventSum / eventDates.size;
    const normalAvgAbsPct = normalCount > 0 ? normalSum / normalCount : 0;
    const lastEventDate = [...eventDates].sort().pop()!;
    return {
        events: eventDates.size,
        eventAvgAbsPct,
        normalAvgAbsPct,
        ratio: normalAvgAbsPct > 0 ? eventAvgAbsPct / normalAvgAbsPct : 1,
        last: { date: lastEventDate, movePct: returnByDate.get(lastEventDate)! },
    };
}

const pct = (v: number) => `${v.toFixed(1).replace('.', ',')} %`;

export function readSensitivity(symbol: string, s: MacroSensitivity | null): string {
    if (!s) return `${symbol} : pas assez d'historique.`;
    const level = s.ratio >= 1.4 ? 'nettement plus que d’habitude' : s.ratio >= 1.1 ? 'un peu plus que d’habitude' : 'pas plus que d’habitude';
    return `${symbol} bouge en moyenne de ${pct(s.eventAvgAbsPct)} ces jours-là, contre ${pct(s.normalAvgAbsPct)} un jour normal : ${level} (${s.events} séances mesurées).`;
}
