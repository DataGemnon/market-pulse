/**
 * How a market shock lands on one stock: its usual sensitivity (beta) to the
 * matching benchmark, applied to the benchmark's move during the shock.
 * Pure functions; the route feeds them EODHD daily closes and live quotes.
 */

export type DailyClose = { date: string; close: number };

export type ImpactRow = {
    symbol: string;
    benchmark: string;
    beta: number | null;
    benchmarkMovePct: number | null;
    expectedMovePct: number | null;
    dayChangePct: number | null;
    benchmarkDayChangePct: number | null;
    reading: string;
};

const MIN_OBSERVATIONS = 40;

function logReturnsByDate(closes: DailyClose[]): Map<string, number> {
    const sorted = [...closes].filter(c => c.close > 0).sort((a, b) => a.date.localeCompare(b.date));
    const returns = new Map<string, number>();
    for (let i = 1; i < sorted.length; i++) {
        returns.set(sorted[i].date, Math.log(sorted[i].close / sorted[i - 1].close));
    }
    return returns;
}

/** OLS beta of the stock's daily returns on the benchmark's, on shared dates. */
export function computeBeta(stock: DailyClose[], benchmark: DailyClose[]): number | null {
    const stockReturns = logReturnsByDate(stock);
    const benchReturns = logReturnsByDate(benchmark);
    const pairs: [number, number][] = [];
    for (const [date, r] of stockReturns) {
        const b = benchReturns.get(date);
        if (b !== undefined) pairs.push([r, b]);
    }
    if (pairs.length < MIN_OBSERVATIONS) return null;
    const meanS = pairs.reduce((sum, [s]) => sum + s, 0) / pairs.length;
    const meanB = pairs.reduce((sum, [, b]) => sum + b, 0) / pairs.length;
    let cov = 0;
    let varB = 0;
    for (const [s, b] of pairs) {
        cov += (s - meanS) * (b - meanB);
        varB += (b - meanB) ** 2;
    }
    return varB > 0 ? cov / varB : null;
}

const pct = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')} %`;
const times = (value: number) => value.toFixed(1).replace('.', ',');
const startsWithVowel = (name: string) => /^[AEIOUY]/i.test(name);
const theName = (name: string) => (startsWithVowel(name) ? `l'${name}` : `le ${name}`);
const toName = (name: string) => (startsWithVowel(name) ? `à l'${name}` : `au ${name}`);

/** One plain-French sentence; describes, never recommends. */
export function readImpact(row: Omit<ImpactRow, 'reading'>): string {
    if (row.beta === null) return "Pas assez d'historique pour mesurer la sensibilité de ce titre.";
    const sensitivity = Math.abs(row.beta) < 0.5
        ? `réagit peu ${toName(row.benchmark)} (bêta ${times(row.beta)})`
        : `bouge en moyenne ${times(row.beta)} fois ${theName(row.benchmark)}`;
    if (row.expectedMovePct === null || row.benchmarkMovePct === null) {
        return `Ce titre ${sensitivity}. Pas de mesure de ${theName(row.benchmark)} pendant ce choc (marché fermé ou cotation pas encore disponible).`;
    }
    const base = `Ce titre ${sensitivity}. Pendant le choc, ${theName(row.benchmark)} a fait ${pct(row.benchmarkMovePct)} : mouvement attendu d'environ ${pct(row.expectedMovePct)}.`;
    if (row.dayChangePct === null || row.benchmarkDayChangePct === null) return base;
    // Compare like with like: the stock's day against what its beta implies for the benchmark's day
    const gap = row.dayChangePct - row.beta * row.benchmarkDayChangePct;
    const verdict = Math.abs(gap) < 1
        ? 'Sa variation du jour est dans la norme.'
        : gap < 0
            ? `Il fait nettement moins bien (${pct(row.dayChangePct)} sur la journée) : une raison propre au titre peut s'ajouter au choc.`
            : `Il résiste mieux (${pct(row.dayChangePct)} sur la journée) : une raison propre au titre peut compenser le choc.`;
    return `${base} ${verdict}`;
}
