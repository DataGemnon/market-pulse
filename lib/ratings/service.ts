import 'server-only';
import { unstable_cache } from 'next/cache';
import { AI_MODEL, getAiClient, isAiEnabled, parseJsonObject, responseText } from '@/lib/ai';
import { fetchEODHD } from '@/lib/eodhd';
import { ACTION_LABELS, extractRating, type ExtractedRating, type RatingAction } from './extract';

/**
 * "Les recos qui changent", budget version: find large caps moving abnormally
 * versus their market today, then look for a broker rating change in their
 * news. A selection, not an exhaustive feed (no licensed ratings feed yet).
 */

export type RatingMove = {
    symbol: string;          // app symbol (AAPL, MC.PA)
    name: string;
    market: 'US' | 'Paris';
    changePct: number;
    marketChangePct: number;
    headline: string;
    url: string;
    publishedAt: string;
    actionLabel: string;
} & ExtractedRating;

type Universe = { market: 'US' | 'Paris'; tickers: { ticker: string; name: string }[]; benchmark: string };
type BulkRow = { code: string; close: number; volume: number };
type RealTimeRow = { code: string; change_p: number | 'NA' };
type NewsRow = { date: string; title: string; link: string; symbols?: string[] };

const ABNORMAL_EXCESS_PCT = 3;
const MAX_MOVERS = 25;
const NEWS_LOOKBACK_HOURS = 36;
const SP500_CSV = 'https://raw.githubusercontent.com/datasets/s-and-p-500-companies/main/data/constituents.csv';
const ETF_NAME = /\b(ETF|UCITS|MSCI|S&P\s?500|Amundi|Lyxor|iShares|Xtrackers|BNPP? Easy|Ossiam|Tracker|Fund|SICAV)\b/i;

async function getSp500(): Promise<{ ticker: string; name: string }[]> {
    const res = await fetch(SP500_CSV, { next: { revalidate: 7 * 86400 } });
    if (!res.ok) throw new Error(`S&P 500 list ${res.status}`);
    return (await res.text())
        .split('\n')
        .slice(1)
        .map(line => line.match(/^([^,]+),("?)(.*?)\2,/))
        .filter((m): m is RegExpMatchArray => Boolean(m))
        .map(m => ({ ticker: `${m[1].replace('.', '-')}.US`, name: m[3] }));
}

/** The 120 most traded shares in Paris yesterday, a close proxy for the SBF 120. */
async function getParisTop120(): Promise<{ ticker: string; name: string }[]> {
    const [bulk, list] = await Promise.all([
        fetchEODHD<BulkRow[]>('/eod-bulk-last-day/PA', {}, 86400),
        fetchEODHD<{ Code: string; Name: string; Isin: string | null }[]>('/exchange-symbol-list/PA', { type: 'common_stock' }, 7 * 86400),
    ]);
    const names = new Map(list.filter(s => !ETF_NAME.test(s.Name)).map(s => [s.Code, s.Name]));
    return bulk
        .filter(row => names.has(row.code) && row.close > 0)
        .sort((a, b) => b.close * b.volume - a.close * a.volume)
        .slice(0, 120)
        .map(row => ({ ticker: `${row.code}.PA`, name: names.get(row.code)! }));
}

async function getUniverses(): Promise<Universe[]> {
    const [us, paris] = await Promise.all([
        getSp500().catch(error => { console.error(error); return []; }),
        getParisTop120().catch(error => { console.error(error); return []; }),
    ]);
    return [
        { market: 'US', tickers: us, benchmark: 'SPY.US' },
        { market: 'Paris', tickers: paris, benchmark: 'FCHI.INDX' },
    ];
}

async function getChanges(tickers: string[]): Promise<Map<string, number>> {
    const changes = new Map<string, number>();
    const batches: string[][] = [];
    for (let i = 0; i < tickers.length; i += 15) batches.push(tickers.slice(i, i + 15));
    // A few batches at a time to stay polite with the API
    for (let i = 0; i < batches.length; i += 6) {
        await Promise.all(batches.slice(i, i + 6).map(async ([first, ...rest]) => {
            try {
                const data = await fetchEODHD<RealTimeRow | RealTimeRow[]>(`/real-time/${first}`, rest.length ? { s: rest.join(',') } : {}, 3600);
                for (const row of Array.isArray(data) ? data : [data]) {
                    if (typeof row.change_p === 'number') changes.set(String(row.code).toUpperCase(), row.change_p);
                }
            } catch (error) {
                console.error('ratings real-time batch failed:', error);
            }
        }));
    }
    return changes;
}

const toAppSymbol = (ticker: string) => ticker.replace(/\.US$/, '');

async function findRatingNews(ticker: string): Promise<{ row: NewsRow; rating: ExtractedRating } | null> {
    const from = new Date(Date.now() - NEWS_LOOKBACK_HOURS * 3600 * 1000).toISOString().slice(0, 10);
    try {
        const news = await fetchEODHD<NewsRow[]>('/news', { s: ticker, from, limit: '15' }, 3600);
        for (const row of news ?? []) {
            const rating = extractRating(row.title);
            if (rating) return { row, rating };
        }
    } catch (error) {
        console.error(`ratings news ${ticker} failed:`, error);
    }
    return null;
}

/** One Claude call for all headlines the patterns could not fully read. */
async function completeWithAi(moves: RatingMove[]): Promise<void> {
    const todo = moves.filter(m => m.method === 'keyword');
    if (todo.length === 0 || !isAiEnabled()) return;
    const list = todo.map((m, i) => `${i}. [${m.symbol}] ${m.headline}`).join('\n');
    try {
        const response = await getAiClient().messages.create({
            model: AI_MODEL,
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: `Pour chaque titre de presse ci-dessous, extrais le changement de recommandation d'analyste s'il y en a un. N'invente rien : null si absent du titre.
${list}
Réponds uniquement en JSON : {"items":[{"i":0,"broker":"...|null","action":"upgrade|downgrade|initiation|target_up|target_down|reiteration|unknown","fromRating":"...|null","toRating":"...|null","priceTarget":"...|null"}]}`,
            }],
        });
        const parsed = parseJsonObject<{ items: (Partial<ExtractedRating> & { i: number })[] }>(responseText(response.content));
        for (const item of parsed?.items ?? []) {
            const move = todo[item.i];
            if (!move) continue;
            const action = (item.action && item.action in ACTION_LABELS ? item.action : move.action) as RatingAction;
            Object.assign(move, {
                broker: item.broker ?? null, action, fromRating: item.fromRating ?? null,
                toRating: item.toRating ?? null, priceTarget: item.priceTarget ?? null,
                method: 'ai', actionLabel: ACTION_LABELS[action],
            });
        }
    } catch (error) {
        console.error('rating extraction by AI failed:', error);
    }
}

async function computeRatingMoves(): Promise<RatingMove[]> {
    const universes = await getUniverses();
    const allTickers = universes.flatMap(u => [u.benchmark, ...u.tickers.map(t => t.ticker)]);
    const changes = await getChanges(allTickers);

    const movers = universes.flatMap(universe => {
        const marketChange = changes.get(universe.benchmark.toUpperCase());
        if (marketChange === undefined) return [];
        return universe.tickers
            .map(t => ({ ...t, market: universe.market, changePct: changes.get(t.ticker.toUpperCase()), marketChangePct: marketChange }))
            .filter((t): t is typeof t & { changePct: number } => t.changePct !== undefined && Math.abs(t.changePct - marketChange) >= ABNORMAL_EXCESS_PCT);
    })
        .sort((a, b) => Math.abs(b.changePct - b.marketChangePct) - Math.abs(a.changePct - a.marketChangePct))
        .slice(0, MAX_MOVERS);

    const found = await Promise.all(movers.map(async mover => {
        const news = await findRatingNews(mover.ticker);
        if (!news) return null;
        const move: RatingMove = {
            symbol: toAppSymbol(mover.ticker),
            name: mover.name,
            market: mover.market,
            changePct: mover.changePct,
            marketChangePct: mover.marketChangePct,
            headline: news.row.title,
            url: news.row.link,
            publishedAt: news.row.date,
            actionLabel: ACTION_LABELS[news.rating.action],
            ...news.rating,
        };
        return move;
    }));
    const moves = found.filter((m): m is RatingMove => m !== null);
    await completeWithAi(moves);
    // Newest first: deliberately not ranked by size of move or upside
    return moves.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export const getRatingMoves = unstable_cache(computeRatingMoves, ['rating-moves-v1'], { revalidate: 3600 });
