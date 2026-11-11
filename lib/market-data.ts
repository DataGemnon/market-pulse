import 'server-only';
/**
 * Market data facade. EODHD (Active Trader plan) is the provider for every
 * market, intraday charts included; Yahoo Finance is only a fallback.
 *
 * Features that need an EODHD plan above Historian (corporate calendar,
 * economic events) degrade to empty results instead of failing.
 */
import {
    StockQuote, StockSearchResult, MarketIndex, NewsArticle, HistoricalPrice,
    AnalystRating, EarningsCall, PriceTarget, SectorPerformance, AnalystConsensus,
    RatingChange, UpcomingEarnings, EconomicEvent, GeneralNewsArticle,
} from '@/types';
import { fetchEODHD, getEODHDNews, isNonUSSymbol, searchEODHD, toEODHDTicker } from '@/lib/eodhd';

// EODHD recommends at most 15-20 tickers per real-time request.
const REALTIME_BATCH_SIZE = 15;
const QUOTE_CACHE_SECONDS = 60;
const EOD_CACHE_SECONDS = 3600;
const CALENDAR_CACHE_SECONDS = 3600;

type RealTimeQuote = {
    code: string;
    timestamp: number | 'NA';
    open: number | 'NA';
    high: number | 'NA';
    low: number | 'NA';
    close: number | 'NA';
    volume: number | 'NA';
    previousClose: number | 'NA';
    change: number | 'NA';
    change_p: number | 'NA';
};

type EodBar = { date: string; close: number; adjusted_close?: number };

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

function chunk<T>(items: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
    return chunks;
}

// ── Quotes ────────────────────────────────────────────────────────────────

/** Fetch delayed quotes for many app symbols; the map is keyed by app symbol. */
async function fetchRealTimeQuotes(symbols: string[]): Promise<Map<string, RealTimeQuote>> {
    const byTicker = new Map(symbols.map(s => [toEODHDTicker(s).toUpperCase(), s]));
    const quotes = new Map<string, RealTimeQuote>();

    await Promise.all(chunk(symbols, REALTIME_BATCH_SIZE).map(async group => {
        const [first, ...rest] = group.map(toEODHDTicker);
        const params: Record<string, string> = rest.length > 0 ? { s: rest.join(',') } : {};
        try {
            const data = await fetchEODHD<RealTimeQuote | RealTimeQuote[]>(
                `/real-time/${first}`, params, QUOTE_CACHE_SECONDS
            );
            for (const quote of Array.isArray(data) ? data : [data]) {
                const appSymbol = byTicker.get(String(quote.code).toUpperCase());
                if (appSymbol && quote.close !== 'NA') quotes.set(appSymbol, quote);
            }
        } catch (error) {
            console.error('EODHD real-time error:', error);
        }
    }));

    return quotes;
}

const SUFFIX_CURRENCY: Record<string, string> = {
    PA: 'EUR', AS: 'EUR', BR: 'EUR', LS: 'EUR', MI: 'EUR', MC: 'EUR', DE: 'EUR', F: 'EUR', VI: 'EUR', HE: 'EUR', IR: 'EUR',
    L: 'GBp', SW: 'CHF', ST: 'SEK', CO: 'DKK', OL: 'NOK',
    HK: 'HKD', T: 'JPY', SS: 'CNY', SZ: 'CNY', KS: 'KRW', AX: 'AUD', TO: 'CAD',
};

/** EODHD real-time quotes carry no currency, so infer it from the exchange suffix. */
function currencyForSymbol(symbol: string): string {
    if (!isNonUSSymbol(symbol)) return 'USD';
    return SUFFIX_CURRENCY[symbol.split('.').pop()!.toUpperCase()] || '';
}

function toStockQuote(symbol: string, quote: RealTimeQuote, name: string, currency: string): StockQuote {
    return {
        symbol,
        name,
        price: num(quote.close),
        changesPercentage: num(quote.change_p),
        change: num(quote.change),
        dayLow: num(quote.low),
        dayHigh: num(quote.high),
        // 52-week range, market cap, EPS and P/E need EODHD fundamentals (not in Historian)
        yearHigh: 0,
        yearLow: 0,
        marketCap: 0,
        volume: num(quote.volume),
        avgVolume: 0,
        open: num(quote.open),
        previousClose: num(quote.previousClose),
        eps: 0,
        pe: 0,
        earningsAnnouncement: '',
        sharesOutstanding: 0,
        timestamp: num(quote.timestamp),
        currency,
    };
}

async function getYahooQuote(symbol: string): Promise<StockQuote> {
    const encoded = encodeURIComponent(symbol);
    const res = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=1d`,
        { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (!res.ok) throw new Error(`Yahoo Finance Error: ${res.status}`);
    const json = await res.json();
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta) throw new Error('Stock not found on Yahoo Finance');

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;
    const change = price - prevClose;

    return {
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || symbol,
        price,
        changesPercentage: (change / prevClose) * 100,
        change,
        dayLow: meta.regularMarketDayLow || 0,
        dayHigh: meta.regularMarketDayHigh || 0,
        yearHigh: meta.fiftyTwoWeekHigh || 0,
        yearLow: meta.fiftyTwoWeekLow || 0,
        marketCap: 0,
        volume: meta.regularMarketVolume || 0,
        avgVolume: 0,
        open: 0,
        previousClose: prevClose,
        eps: 0,
        pe: 0,
        earningsAnnouncement: '',
        sharesOutstanding: 0,
        timestamp: meta.regularMarketTime || 0,
        currency: meta.currency || 'USD',
    };
}

/** EODHD delayed quotes for every symbol, Yahoo for any EODHD misses. */
export const getBatchQuotes = async (symbols: string[]): Promise<StockQuote[]> => {
    if (symbols.length === 0) return [];
    const quotes = await fetchRealTimeQuotes(symbols);

    return (await Promise.all(symbols.map(async symbol => {
        const quote = quotes.get(symbol);
        if (quote) return toStockQuote(symbol, quote, symbol, currencyForSymbol(symbol));
        return getYahooQuote(symbol).catch(() => null);
    }))).filter((q): q is StockQuote => q !== null);
};

/** Single quote with the company name and 52-week range filled in. */
export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
    const [quotes, history, matches] = await Promise.all([
        fetchRealTimeQuotes([symbol]),
        getEodHistory(symbol, 365).catch(() => [] as HistoricalPrice[]),
        searchEODHD(symbol, 5).catch(() => [] as StockSearchResult[]),
    ]);

    const quote = quotes.get(symbol);
    if (!quote) return getYahooQuote(symbol);

    const match = matches.find(m => m.symbol.toUpperCase() === symbol.toUpperCase());
    const result = toStockQuote(symbol, quote, match?.name || symbol, currencyForSymbol(symbol));
    if (history.length > 0) {
        const closes = history.map(p => p.close);
        result.yearHigh = Math.max(...closes);
        result.yearLow = Math.min(...closes);
    }
    return result;
};

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
    if (!query) return [];
    return searchEODHD(query, 10);
};

// ── Indices & sectors ─────────────────────────────────────────────────────

const US_INDICES: { symbol: string; name: string }[] = [
    { symbol: '^GSPC', name: 'S&P 500' },
    { symbol: '^IXIC', name: 'NASDAQ Composite' },
    { symbol: '^DJI', name: 'Dow Jones Industrial Average' },
    { symbol: 'BTC-USD', name: 'Bitcoin USD' },
];

const INTL_INDICES: { symbol: string; name: string }[] = [
    { symbol: '^FCHI', name: 'CAC 40' },
    { symbol: '^GDAXI', name: 'DAX' },
    // FTSE 100 is not licensed on EODHD (quotes come back "NA"); Euro Stoxx 50 is
    { symbol: '^STOXX50E', name: 'Euro Stoxx 50' },
    { symbol: '^N225', name: 'Nikkei 225' },
    { symbol: '^HSI', name: 'Hang Seng Index' },
];

async function fetchYahooIndex(symbol: string): Promise<MarketIndex | null> {
    try {
        const quote = await getYahooQuote(symbol);
        return { symbol, name: quote.name, price: quote.price, changesPercentage: quote.changesPercentage, change: quote.change };
    } catch {
        return null;
    }
}

async function getIndices(list: { symbol: string; name: string }[]): Promise<MarketIndex[]> {
    const quotes = await fetchRealTimeQuotes(list.map(i => i.symbol));
    const results = await Promise.all(list.map(async ({ symbol, name }) => {
        const quote = quotes.get(symbol);
        if (!quote) return fetchYahooIndex(symbol);
        return { symbol, name, price: num(quote.close), changesPercentage: num(quote.change_p), change: num(quote.change) };
    }));
    return results.filter((r): r is MarketIndex => r !== null);
}

export const getMarketIndices = async (): Promise<MarketIndex[]> => getIndices(US_INDICES);

export const getInternationalIndices = async (): Promise<MarketIndex[]> => getIndices(INTL_INDICES);

const SECTOR_ETFS: { symbol: string; sector: string }[] = [
    { symbol: 'XLK', sector: 'Information Technology' },
    { symbol: 'XLV', sector: 'Health Care' },
    { symbol: 'XLF', sector: 'Financials' },
    { symbol: 'XLE', sector: 'Energy' },
    { symbol: 'XLY', sector: 'Consumer Cyclical' },
    { symbol: 'XLP', sector: 'Consumer Defensive' },
    { symbol: 'XLC', sector: 'Communication Services' },
    { symbol: 'XLI', sector: 'Industrials' },
    { symbol: 'XLB', sector: 'Materials' },
    { symbol: 'XLRE', sector: 'Real Estate' },
    { symbol: 'XLU', sector: 'Utilities' },
];

export const getSectorPerformance = async (): Promise<SectorPerformance[]> => {
    const quotes = await getBatchQuotes(SECTOR_ETFS.map(e => e.symbol));
    return quotes.map(quote => ({
        sector: SECTOR_ETFS.find(e => e.symbol === quote.symbol)?.sector || quote.name,
        changesPercentage: quote.changesPercentage,
        etfSymbol: quote.symbol,
        price: quote.price,
    }));
};

// ── Charts ────────────────────────────────────────────────────────────────

async function getEodHistory(symbol: string, days: number | null): Promise<HistoricalPrice[]> {
    const params: Record<string, string> = { period: 'd' };
    if (days !== null) {
        params.from = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
        params.period = 'w';
    }
    const data = await fetchEODHD<EodBar[]>(`/eod/${toEODHDTicker(symbol)}`, params, EOD_CACHE_SECONDS);
    if (!Array.isArray(data)) return [];
    return data.map(bar => ({ date: bar.date, close: bar.adjusted_close ?? bar.close }));
}

const EOD_RANGE_DAYS: Record<string, number | null> = { '1M': 31, '3M': 92, '1Y': 366, 'ALL': null };

type IntradayBar = { timestamp: number; close: number | null };

const INTRADAY_RANGES: Record<'1D' | '1W', { interval: string; lookbackDays: number; keepDays: number }> = {
    // Look back a few days so weekends and holidays still show the last session
    '1D': { interval: '5m', lookbackDays: 5, keepDays: 1 },
    '1W': { interval: '1h', lookbackDays: 10, keepDays: 7 },
};

async function getIntradayHistory(symbol: string, range: '1D' | '1W'): Promise<HistoricalPrice[]> {
    const { interval, lookbackDays, keepDays } = INTRADAY_RANGES[range];
    const from = Math.floor(Date.now() / 1000) - lookbackDays * 24 * 60 * 60;
    const data = await fetchEODHD<IntradayBar[]>(
        `/intraday/${toEODHDTicker(symbol)}`, { interval, from: String(from) }, QUOTE_CACHE_SECONDS * 5
    );
    if (!Array.isArray(data)) return [];
    const bars = data.filter(bar => typeof bar.close === 'number');
    if (bars.length === 0) return [];

    // 1D = last trading session only; 1W = the last 7 calendar days of bars
    const last = bars[bars.length - 1].timestamp;
    const cutoff = range === '1D'
        ? new Date(new Date(last * 1000).toISOString().split('T')[0]).getTime() / 1000
        : last - keepDays * 24 * 60 * 60;
    return bars
        .filter(bar => bar.timestamp >= cutoff)
        .map(bar => ({ date: new Date(bar.timestamp * 1000).toISOString(), close: bar.close as number }));
}

export const getHistoricalChart = async (symbol: string, range: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'): Promise<HistoricalPrice[]> => {
    try {
        const prices = range === '1D' || range === '1W'
            ? await getIntradayHistory(symbol, range)
            : await getEodHistory(symbol, EOD_RANGE_DAYS[range]);
        if (prices.length > 0) return prices;
    } catch (error) {
        console.error(`EODHD history failed for ${symbol}, trying Yahoo:`, error);
    }
    return getYahooHistorical(symbol, range);
};

async function getYahooHistorical(symbol: string, range: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'): Promise<HistoricalPrice[]> {
    const rangeMap: Record<string, { range: string; interval: string }> = {
        '1D': { range: '1d', interval: '5m' },
        '1W': { range: '5d', interval: '30m' },
        '1M': { range: '1mo', interval: '1h' },
        '3M': { range: '3mo', interval: '1d' },
        '1Y': { range: '1y', interval: '1d' },
        'ALL': { range: '5y', interval: '1wk' },
    };
    const { range: yRange, interval } = rangeMap[range] || rangeMap['1M'];

    try {
        const encoded = encodeURIComponent(symbol);
        const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=${yRange}&interval=${interval}`,
            { cache: 'no-store', headers: { 'User-Agent': 'Mozilla/5.0' } }
        );
        if (!res.ok) return [];
        const json = await res.json();
        const result = json.chart?.result?.[0];
        if (!result) return [];

        const timestamps: number[] = result.timestamp || [];
        const closes: (number | null)[] = result.indicators?.quote?.[0]?.close || [];

        const prices: HistoricalPrice[] = [];
        for (let i = 0; i < timestamps.length; i++) {
            if (closes[i] != null) {
                prices.push({ date: new Date(timestamps[i] * 1000).toISOString(), close: closes[i] as number });
            }
        }
        return prices;
    } catch {
        return [];
    }
}

/** Two weeks of daily closes; enough for a watchlist sparkline. */
export async function getSparklineData(symbol: string): Promise<HistoricalPrice[]> {
    try {
        const prices = await getEodHistory(symbol, 14);
        if (prices.length > 0) return prices;
    } catch { /* fall back */ }
    return getYahooHistorical(symbol, '1W');
}

// ── News ──────────────────────────────────────────────────────────────────

// Each EODHD news request costs 5 calls + 5 per ticker, so cap the fan-out.
const MAX_NEWS_TICKERS = 20;

function dedupeByTitle<T extends { title: string }>(items: T[]): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const key = item.title.toLowerCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

const byNewestFirst = (a: { publishedDate: string }, b: { publishedDate: string }) =>
    new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();

export const getMarketNews = async (limit: number = 20, tickers?: string[]): Promise<NewsArticle[]> => {
    const symbols = (tickers && tickers.length > 0 ? tickers : ['SPY', 'QQQ']).slice(0, MAX_NEWS_TICKERS);
    const perTicker = Math.max(5, Math.ceil(limit / symbols.length));
    const batches = await Promise.all(symbols.map(s => getEODHDNews(s, perTicker)));
    return dedupeByTitle(batches.flat()).sort(byNewestFirst).slice(0, limit);
};

const BROAD_MARKET_TICKERS = ['SPY', 'QQQ', 'DIA', 'IWM'];

export const getGeneralNews = async (limit: number = 30): Promise<GeneralNewsArticle[]> => {
    const articles = await getMarketNews(limit, BROAD_MARKET_TICKERS);
    return articles.map(article => ({
        publishedDate: article.publishedDate,
        title: article.title,
        image: article.image,
        site: article.site,
        text: article.text,
        url: article.url,
        uuid: article.url || `news-${article.publishedDate}-${article.title.slice(0, 20)}`,
        author: article.site,
    }));
};

// ── Calendars (need an EODHD plan with the corporate calendar) ────────────

type EarningsEntry = {
    code: string;
    report_date: string;
    before_after_market: string | null;
    actual: number | null;
    estimate: number | null;
};

const toTiming = (value: string | null): string =>
    value === 'BeforeMarket' ? 'bmo' : value === 'AfterMarket' ? 'amc' : '';

/** EODHD returns "AAPL.US"; map back to the app symbol that was asked for. */
function symbolLookup(symbols: string[]): Map<string, string> {
    return new Map(symbols.map(s => [toEODHDTicker(s).toUpperCase(), s]));
}

async function fetchEarnings(symbols: string[], from: string, to: string): Promise<EarningsEntry[]> {
    const data = await fetchEODHD<{ earnings?: EarningsEntry[] }>('/calendar/earnings', {
        symbols: symbols.map(toEODHDTicker).join(','),
        from,
        to,
    }, CALENDAR_CACHE_SECONDS);
    return Array.isArray(data?.earnings) ? data.earnings : [];
}

const isoDate = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

export const getUpcomingEarnings = async (symbols: string[]): Promise<UpcomingEarnings[]> => {
    if (symbols.length === 0) return [];
    try {
        const lookup = symbolLookup(symbols);
        const entries = await fetchEarnings(symbols, isoDate(0), isoDate(60));
        return entries
            .map(entry => {
                const symbol = lookup.get(entry.code.toUpperCase()) || entry.code;
                return {
                    symbol,
                    name: symbol,
                    date: entry.report_date,
                    epsEstimated: entry.estimate,
                    revenueEstimated: null,
                    time: toTiming(entry.before_after_market),
                };
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } catch (error) {
        console.error('Error fetching upcoming earnings (EODHD calendar):', error);
        return [];
    }
};

export const getEarningsCalendar = async (symbol: string): Promise<EarningsCall[]> => {
    try {
        const entries = await fetchEarnings([symbol], isoDate(-400), isoDate(120));
        return entries
            .sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())
            .slice(0, 4)
            .map(entry => ({
                symbol,
                date: entry.report_date,
                epsEstimated: entry.estimate ?? 0,
                epsActual: entry.actual,
                revenueEstimated: 0,
                revenueActual: null,
                time: toTiming(entry.before_after_market),
            }));
    } catch (error) {
        console.error(`Error fetching earnings for ${symbol} (EODHD calendar):`, error);
        return [];
    }
};

type EconomicEntry = {
    type: string;
    country: string;
    date: string;
    actual: number | null;
    previous: number | null;
    estimate: number | null;
};

const COUNTRY_CURRENCY: Record<string, string> = { US: 'USD', EU: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', GB: 'GBP', UK: 'GBP', JP: 'JPY', CN: 'CNY' };

export const getEconomicCalendar = async (from?: string, to?: string): Promise<EconomicEvent[]> => {
    try {
        const params: Record<string, string> = { limit: '200' };
        if (from) params.from = from;
        if (to) params.to = to;
        const data = await fetchEODHD<EconomicEntry[]>('/economic-events', params, CALENDAR_CACHE_SECONDS);
        if (!Array.isArray(data)) return [];
        return data.map(item => ({
            event: item.type,
            date: item.date,
            country: item.country,
            actual: item.actual,
            previous: item.previous,
            estimate: item.estimate,
            // EODHD does not rate event importance
            impact: 'None' as const,
            currency: COUNTRY_CURRENCY[item.country] || '',
            unit: '',
        }));
    } catch (error) {
        console.error('Error fetching economic calendar (EODHD):', error);
        return [];
    }
};

// ── Analysts ──────────────────────────────────────────────────────────────

// Individual rating changes and price targets came from FMP, which has no
// EODHD equivalent. They will come from rating changes extracted from news;
// until then these return empty results so the UI hides the sections.
export const getAnalystRatings = async (_symbol: string, _limit: number = 5): Promise<AnalystRating[]> => [];

export const getPriceTargets = async (_symbol: string, _limit: number = 5): Promise<PriceTarget[]> => [];

export const getRecentRatingChanges = async (_symbols?: string[]): Promise<RatingChange[]> => [];

export const getAnalystUpgrades = async (): Promise<AnalystRating[]> => [];

export const getHighUpsideStocks = async (): Promise<{ symbol: string; name: string; price: number; targetPrice: number; upside: number; analyst: string }[]> => [];

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';

/** Finnhub free tier, US stocks only. */
export const getFinnhubRecommendation = async (symbol: string): Promise<AnalystConsensus[]> => {
    if (!FINNHUB_KEY) return [];
    try {
        const res = await fetch(
            `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`,
            { next: { revalidate: 3600 } }
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (!Array.isArray(data)) return [];
        return data.slice(0, 6).map((item: Record<string, unknown>) => ({
            symbol: (item.symbol as string) || symbol,
            date: (item.period as string) || '',
            strongBuy: num(item.strongBuy),
            buy: num(item.buy),
            hold: num(item.hold),
            sell: num(item.sell),
            strongSell: num(item.strongSell),
        }));
    } catch (error) {
        console.error(`Error fetching Finnhub recommendation for ${symbol}:`, error);
        return [];
    }
};

// ── Discovery ─────────────────────────────────────────────────────────────

const DISCOVERY_SYMBOLS = [
    // Tech & Semis
    'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA',
    'AMD', 'INTC', 'QCOM', 'AVGO', 'MU',
    // Consumer Discretionary & Retail
    'HD', 'NKE', 'SBUX', 'MCD', 'TGT',
    // Consumer Staples
    'WMT', 'COST', 'PG', 'KO', 'PEP',
    // Financials
    'JPM', 'BAC', 'V', 'MA', 'BRK-B', 'GS',
    // Industrials & Aerospace
    'CAT', 'GE', 'BA', 'DE', 'HON',
    // Healthcare
    'LLY', 'NVO', 'JNJ', 'PFE', 'UNH',
    // Energy
    'XOM', 'CVX', 'COP',
    // Telecom & Media
    'VZ', 'T', 'NFLX', 'DIS'
];

export const getDiscoveryStocks = () => DISCOVERY_SYMBOLS;

const DISCOVERY_KEYWORDS = ['opportunity', 'attractive', 'undervalued', 'potential', 'upgrade', 'buy rating', 'strong buy'];

export const getDiscoveryNews = async (): Promise<NewsArticle[]> => {
    const rawNews = await getMarketNews(50, DISCOVERY_SYMBOLS);
    return rawNews.filter(item => {
        const content = `${item.title} ${item.text} ${item.site}`.toLowerCase();
        const isTalk = content.includes('talk') || content.includes('insight') || content.includes('analysis');
        return isTalk || DISCOVERY_KEYWORDS.some(k => content.includes(k));
    }).slice(0, 10);
};
