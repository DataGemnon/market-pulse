import 'server-only';
import { fetchEODHD, isNonUSSymbol } from '@/lib/eodhd';
import { AMF_FIELDS, buildAmfWhere, parseAmfRecords, type AmfRecord } from './amf-parse';
import { describeForm4, parseForm4, parseSubmissions, type SecSubmissions } from './sec-parse';
import type { WatchlistEvent } from './types';

/**
 * Official publications for the watchlist: SEC EDGAR for US stocks, the
 * DILA/AMF feed for stocks with a French ISIN. Both are free public APIs.
 */

const LOOKBACK_DAYS = 30;
const FORM4_DETAILS_PER_SYMBOL = 4;

// SEC asks automated clients to identify themselves with a contact.
const SEC_HEADERS = {
    'User-Agent': process.env.SEC_USER_AGENT || 'MarketPulse/0.1 (+https://market-pulse-nine-delta.vercel.app)',
    Accept: 'application/json, text/xml, */*',
};

const AMF_RECORDS_URL = 'https://www.info-financiere.gouv.fr/api/explore/v2.1/catalog/datasets/flux-amf-new-prod/records';

async function fetchJson<T>(url: string, init: RequestInit & { next?: { revalidate: number } }): Promise<T | null> {
    try {
        const res = await fetch(url, init);
        if (!res.ok) {
            console.error(`GET ${new URL(url).host}${new URL(url).pathname} -> ${res.status}`);
            return null;
        }
        return (await res.json()) as T;
    } catch (error) {
        console.error(`GET ${url} failed:`, error);
        return null;
    }
}

// ── SEC ───────────────────────────────────────────────────────────────────

type TickerEntry = { cik_str: number; ticker: string; title: string };

async function getCikByTicker(): Promise<Map<string, string>> {
    const data = await fetchJson<Record<string, TickerEntry>>('https://www.sec.gov/files/company_tickers.json', {
        headers: SEC_HEADERS, next: { revalidate: 86400 },
    });
    return new Map(Object.values(data ?? {}).map(e => [e.ticker.toUpperCase(), String(e.cik_str).padStart(10, '0')]));
}

async function getSecEvents(symbol: string, cik: string, since: string): Promise<WatchlistEvent[]> {
    const data = await fetchJson<SecSubmissions>(`https://data.sec.gov/submissions/CIK${cik}.json`, {
        headers: SEC_HEADERS, next: { revalidate: 900 },
    });
    if (!data) return [];
    const events = parseSubmissions({ ...data, cik }, symbol, since);

    // Decode the latest insider filings deterministically (small XML files)
    const insiders = events.filter(e => e.kind === 'insider').slice(0, FORM4_DETAILS_PER_SYMBOL);
    await Promise.all(insiders.map(async event => {
        try {
            const res = await fetch(event.docUrl, { headers: SEC_HEADERS, next: { revalidate: 86400 } });
            if (!res.ok) return;
            const trades = parseForm4(await res.text());
            event.detail = describeForm4(trades) ?? undefined;
            // Open-market purchases are the informative ones
            event.important = trades.some(t => t.code === 'P');
        } catch { /* keep the event without detail */ }
    }));
    return events;
}

// ── AMF ───────────────────────────────────────────────────────────────────

type SearchRow = { Code: string; Exchange: string; ISIN?: string };

async function getIsin(symbol: string): Promise<string | null> {
    const [code, exchange] = symbol.split('.');
    try {
        const rows = await fetchEODHD<SearchRow[]>(`/search/${encodeURIComponent(symbol)}`, { limit: '5' }, 30 * 86400);
        const match = (rows ?? []).find(r => r.Code?.toUpperCase() === code.toUpperCase() && r.Exchange?.toUpperCase() === exchange?.toUpperCase());
        return match?.ISIN ?? null;
    } catch {
        return null;
    }
}

async function getAmfEvents(symbols: string[], since: Date): Promise<WatchlistEvent[]> {
    const pairs = await Promise.all(symbols.map(async s => [await getIsin(s), s] as const));
    const symbolByIsin = new Map(pairs.filter((p): p is [string, string] => Boolean(p[0])));
    // The AMF feed covers issuers whose home regulator is the AMF: French ISINs
    const isins = [...symbolByIsin.keys()].filter(isin => isin.startsWith('FR'));
    if (isins.length === 0) return [];

    const params = new URLSearchParams({
        where: buildAmfWhere(isins, since),
        order_by: 'uin_dat_amf desc',
        limit: '100',
        select: AMF_FIELDS.join(','),
    });
    const page = await fetchJson<{ results: AmfRecord[] }>(`${AMF_RECORDS_URL}?${params}`, {
        headers: { accept: 'application/json' }, next: { revalidate: 900 },
    });
    return parseAmfRecords(page?.results ?? [], symbolByIsin);
}

// ── Both ──────────────────────────────────────────────────────────────────

export async function getWatchlistEvents(symbols: string[]): Promise<WatchlistEvent[]> {
    const sinceDate = new Date(Date.now() - LOOKBACK_DAYS * 86400 * 1000);
    const since = sinceDate.toISOString().slice(0, 10);
    const us = symbols.filter(s => !isNonUSSymbol(s));
    const nonUs = symbols.filter(isNonUSSymbol);

    const ciks = us.length > 0 ? await getCikByTicker() : new Map<string, string>();
    const [secLists, amf] = await Promise.all([
        Promise.all(us.map(s => {
            const cik = ciks.get(s.toUpperCase());
            return cik ? getSecEvents(s, cik, since) : Promise.resolve([]);
        })),
        getAmfEvents(nonUs, sinceDate),
    ]);
    return [...secLists.flat(), ...amf].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Only documents from these hosts can be sent to Claude for decoding. */
export function isOfficialDocUrl(url: string): boolean {
    try {
        const { protocol, hostname } = new URL(url);
        return protocol === 'https:' && ['www.sec.gov', 'fr.ftp.opendatasoft.com', 'www.info-financiere.gouv.fr'].includes(hostname);
    } catch {
        return false;
    }
}

export const SEC_FETCH_HEADERS = SEC_HEADERS;
