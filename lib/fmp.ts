import { StockQuote, MarketIndex, NewsArticle, HistoricalPrice, AnalystRating, EarningsCall, PriceTarget, SectorPerformance, AnalystConsensus, RatingChange, UpcomingEarnings } from '@/types';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;

if (!API_KEY) {
    console.warn('FMP API Key is missing. Please set NEXT_PUBLIC_FMP_API_KEY in .env.local');
}

const fetchFMP = async (endpoint: string, params: Record<string, string> = {}) => {
    if (!API_KEY) {
        throw new Error('API Key is missing');
    }
    const query = new URLSearchParams({ apikey: API_KEY, ...params }).toString();
    const res = await fetch(`${BASE_URL}${endpoint}?${query}`, { cache: 'no-store' });

    if (!res.ok) {
        let errorBody = '';
        try {
            errorBody = await res.text();
        } catch (e) {
            // ignore
        }
        throw new Error(`FMP API Error: ${res.status} ${res.statusText} - ${errorBody}`);
    }
    return res.json();
};

export const searchStocks = async (query: string): Promise<import('@/types').StockSearchResult[]> => {
    if (!query || query.length < 1) return [];
    try {
        const data = await fetchFMP('/search', { query, limit: '10' });
        if (!Array.isArray(data)) return [];
        return data.map((item: Record<string, string>) => ({
            symbol: item.symbol,
            name: item.name,
            exchange: item.exchangeShortName || item.stockExchange || '',
            currency: item.currency || 'USD',
        }));
    } catch {
        return [];
    }
};

export const getMarketIndices = async (): Promise<MarketIndex[]> => {
    try {
        // Fetch major indices using the quotes endpoint
        const data = await fetchFMP('/quotes/index');
        const targetIndices = ['^GSPC', '^IXIC', '^DJI', 'BTC-USD']; // Note: FMP symbols might differ slightly for indices

        // Map common index symbols if needed to match FMP or just filter
        // FMP index symbols: ^GSPC (S&P 500), ^IXIC (Nasdaq), ^DJI (Dow Jones), BTCUSD (Bitcoin)
        // Let's fetch specifically what we need or filter the big list

        // Actually, FMP often uses %5EGSPC for ^GSPC in URL but returning it as ^GSPC
        // Let's filter the response

        return data
            .filter((item: any) => targetIndices.includes(item.symbol) || item.symbol === 'BTCUSD')
            .map((item: any) => ({
                symbol: item.symbol === 'BTCUSD' ? 'BTC-USD' : item.symbol,
                name: item.name,
                price: item.price,
                changesPercentage: item.changesPercentage,
                change: item.change,
            }))
            .slice(0, 4); // return top matches
    } catch (error) {
        console.error('Error fetching market indices:', error);
        return [];
    }
};

// Detect non-US symbols (contain a dot suffix like .PA, .DE, .L, .AS, etc.)
function isNonUSSymbol(symbol: string): boolean {
    return /\.[A-Z]{1,3}$/.test(symbol.toUpperCase());
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
    const changesPercentage = (change / prevClose) * 100;
    const currency = meta.currency || 'USD';

    return {
        symbol: meta.symbol,
        name: meta.longName || meta.shortName || symbol,
        price,
        changesPercentage,
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
        currency,
    };
}

// Batch fetch: FMP for US stocks in one call, Yahoo for non-US in parallel
export const getBatchQuotes = async (symbols: string[]): Promise<StockQuote[]> => {
    const usSymbols = symbols.filter(s => !isNonUSSymbol(s));
    const nonUSSymbols = symbols.filter(s => isNonUSSymbol(s));

    const results: StockQuote[] = [];

    // Fetch all US quotes in a single FMP call
    if (usSymbols.length > 0) {
        try {
            const joined = usSymbols.join(',');
            const data = await fetchFMP(`/quote/${joined}`);
            for (const item of data) {
                results.push({
                    symbol: item.symbol,
                    name: item.name,
                    price: item.price,
                    changesPercentage: item.changesPercentage,
                    change: item.change,
                    dayLow: item.dayLow,
                    dayHigh: item.dayHigh,
                    yearHigh: item.yearHigh,
                    yearLow: item.yearLow,
                    marketCap: item.marketCap,
                    volume: item.volume,
                    avgVolume: item.avgVolume,
                    open: item.open,
                    previousClose: item.previousClose,
                    eps: item.eps,
                    pe: item.pe,
                    earningsAnnouncement: item.earningsAnnouncement,
                    sharesOutstanding: item.sharesOutstanding,
                    timestamp: item.timestamp,
                    currency: 'USD',
                });
            }
        } catch (error) {
            // Fallback: fetch individually via Yahoo
            for (const sym of usSymbols) {
                try {
                    results.push(await getYahooQuote(sym));
                } catch { /* skip */ }
            }
        }
    }

    // Fetch non-US quotes in parallel via Yahoo
    if (nonUSSymbols.length > 0) {
        const yahooResults = await Promise.all(
            nonUSSymbols.map(sym => getYahooQuote(sym).catch(() => null))
        );
        for (const q of yahooResults) {
            if (q) results.push(q);
        }
    }

    return results;
};

export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
    // Non-US symbols go straight to Yahoo Finance
    if (isNonUSSymbol(symbol)) {
        return getYahooQuote(symbol);
    }

    // US symbols: try FMP first, fall back to Yahoo
    try {
        const data = await fetchFMP(`/quote/${symbol}`);
        if (!data || data.length === 0) {
            throw new Error('Stock not found');
        }
        const item = data[0];
        return {
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            changesPercentage: item.changesPercentage,
            change: item.change,
            dayLow: item.dayLow,
            dayHigh: item.dayHigh,
            yearHigh: item.yearHigh,
            yearLow: item.yearLow,
            marketCap: item.marketCap,
            volume: item.volume,
            avgVolume: item.avgVolume,
            open: item.open,
            previousClose: item.previousClose,
            eps: item.eps,
            pe: item.pe,
            earningsAnnouncement: item.earningsAnnouncement,
            sharesOutstanding: item.sharesOutstanding,
            timestamp: item.timestamp,
            currency: 'USD',
        };
    } catch (error) {
        console.error(`FMP quote failed for ${symbol}, trying Yahoo:`, error);
        return getYahooQuote(symbol);
    }
};

const VALID_NEWS_SOURCES = [
    'Bloomberg',
    'CNBC',
    'Reuters',
    'MarketWatch',
    'MarketTalk',
    'Benzinga',
    'The Wall Street Journal',
    'Financial Times',
    'Yahoo Finance',
    'Zacks',
    'Seeking Alpha',
    'GlobeNewswire',
    'PR Newswire',
    'Business Wire'
];

export const getMarketNews = async (limit: number = 20, tickers?: string[]): Promise<NewsArticle[]> => {
    try {
        let endpoint = '/stock_news';
        let params: Record<string, string> = { limit: '50' }; // Fetch more to filter down

        if (tickers && tickers.length > 0) {
            params.tickers = tickers.join(',');
        }

        const data = await fetchFMP(endpoint, params);

        return data
            .filter((item: any) => {
                // Check if the site is in our valid list (case-insensitive partial match or exact)
                // Some sources naturally have variations, but let's try strict inclusion first or simple check
                return VALID_NEWS_SOURCES.some(source => item.site.toLowerCase().includes(source.toLowerCase()));
            })
            .slice(0, limit)
            .map((item: any) => ({
                symbol: item.symbol,
                publishedDate: item.publishedDate,
                title: item.title,
                image: item.image,
                site: item.site,
                text: item.text,
                url: item.url,
            }));
    } catch (error) {
        console.error('Error fetching market news:', error);
        return [];
    }
};

export const getHistoricalChart = async (symbol: string, range: '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'): Promise<HistoricalPrice[]> => {
    // Non-US symbols use Yahoo Finance exclusively
    if (isNonUSSymbol(symbol)) {
        return getYahooHistorical(symbol, range);
    }

    // US: try FMP, fall back to Yahoo
    try {
        let endpoint: string;
        if (range === '1D') {
            endpoint = `/historical-chart/5min/${symbol}`;
        } else if (range === '1W') {
            endpoint = `/historical-chart/30min/${symbol}`;
        } else if (range === '1M') {
            endpoint = `/historical-chart/1hour/${symbol}`;
        } else {
            endpoint = `/historical-chart/4hour/${symbol}`;
        }

        const data = await fetchFMP(endpoint);
        if (!data || data.length === 0) throw new Error('No data');

        const mapped = data.map((item: any) => ({
            date: item.date,
            close: item.close,
        })).reverse();

        // Trim to range
        return trimToRange(mapped, range);
    } catch {
        return getYahooHistorical(symbol, range);
    }
};

function trimToRange(data: HistoricalPrice[], range: string): HistoricalPrice[] {
    if (data.length === 0) return data;
    const now = new Date();
    let cutoff: Date;
    switch (range) {
        case '1D': cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
        case '1W': cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case '1M': cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
        case '3M': cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
        default: return data;
    }
    return data.filter(p => new Date(p.date) >= cutoff);
}

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
                prices.push({
                    date: new Date(timestamps[i] * 1000).toISOString(),
                    close: closes[i] as number,
                });
            }
        }
        return prices;
    } catch {
        return [];
    }
}

// Quick sparkline data (5-day, hourly) via Yahoo for any symbol
export async function getSparklineData(symbol: string): Promise<HistoricalPrice[]> {
    return getYahooHistorical(symbol, '1W');
}

export const getAnalystRatings = async (symbol: string, limit: number = 5): Promise<AnalystRating[]> => {
    try {
        // Endpoint: /grade/{symbol}
        const data = await fetchFMP(`/grade/${symbol}`, { limit: limit.toString() });
        return data.slice(0, limit).map((item: any) => ({
            symbol: item.symbol,
            date: item.date,
            gradingCompany: item.gradingCompany,
            newGrade: item.newGrade,
            previousGrade: item.previousGrade
        }));
    } catch (error) {
        console.error(`Error fetching analyst ratings for ${symbol}:`, error);
        return [];
    }
};

export const getPriceTargets = async (symbol: string, limit: number = 5): Promise<PriceTarget[]> => {
    try {
        // Endpoint: /price-target-consensus?symbol={symbol} OR /price-target?symbol={symbol}
        // Let's try /price-target first as it has history
        const data = await fetchFMP(`/price-target`, { symbol: symbol, limit: limit.toString() });
        return data.slice(0, limit).map((item: any) => ({
            symbol: item.symbol,
            publishedDate: item.publishedDate,
            newsTitle: item.newsTitle,
            analystName: item.analystName,
            priceTarget: item.priceTarget,
            adjPriceTarget: item.adjPriceTarget,
            priceTargetPrevious: item.priceTargetPrevious,
            analystCompany: item.analystCompany
        }));
    } catch (error) {
        console.error(`Error fetching price targets for ${symbol}:`, error);
        return [];
    }
};

// Fetch upcoming earnings for a list of symbols (next 60 days)
export const getUpcomingEarnings = async (symbols: string[]): Promise<UpcomingEarnings[]> => {
    if (symbols.length === 0) return [];

    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    // Use FMP's earning_calendar with date range for one batch call (covers all stocks)
    try {
        const from = now.toISOString().split('T')[0];
        const to = sixtyDaysFromNow.toISOString().split('T')[0];
        const data = await fetchFMP('/earning_calendar', { from, to });

        const symbolSet = new Set(symbols.map(s => s.toUpperCase()));
        const filtered = data.filter((item: any) => symbolSet.has(item.symbol?.toUpperCase()));

        // Get company names in one batch (US symbols only — non-US won't match earning_calendar anyway)
        const nameMap: Record<string, string> = {};
        const usSymbols = symbols.filter(s => !isNonUSSymbol(s));
        if (usSymbols.length > 0) {
            try {
                const quotes = await fetchFMP(`/quote/${usSymbols.join(',')}`);
                for (const q of quotes) nameMap[q.symbol] = q.name || q.symbol;
            } catch { /* ignore */ }
        }

        return filtered
            .map((item: any) => ({
                symbol: item.symbol,
                name: nameMap[item.symbol] || item.symbol,
                date: item.date,
                epsEstimated: item.epsEstimated,
                revenueEstimated: item.revenueEstimated,
                time: item.time || '',
            }))
            .sort((a: UpcomingEarnings, b: UpcomingEarnings) =>
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
    } catch (error) {
        console.error('Error fetching upcoming earnings:', error);
        return [];
    }
};

export const getEarningsCalendar = async (symbol: string): Promise<EarningsCall[]> => {
    try {
        // We want upcoming and recent earnings. 
        // endpoint: /historical/earning_calendar/{symbol} returns past and future? 
        // usually /historical/earning_calendar returns past. 
        // /earning_calendar is for global upcoming.
        // Let's use /historical/earning_calendar/{symbol} and sort.
        const data = await fetchFMP(`/historical/earning_calendar/${symbol}`, { limit: '10' });

        return data.slice(0, 4).map((item: any) => ({
            symbol: item.symbol,
            date: item.date,
            epsEstimated: item.epsEstimated,
            epsActual: item.epsActual,
            revenueEstimated: item.revenueEstimated,
            revenueActual: item.revenueActual,
            time: item.time
        }));
    } catch (error) {
        console.error(`Error fetching earnings for ${symbol}:`, error);
        return [];
    }
};

import { EconomicEvent, GeneralNewsArticle } from '@/types';

export const getGeneralNews = async (limit: number = 30): Promise<GeneralNewsArticle[]> => {
    try {
        // Fetch General News and Major Index News in parallel
        const [general, indices] = await Promise.all([
            fetchFMP('/general_news', { limit: limit.toString() }),
            fetchFMP('/stock_news', { tickers: 'SPY,QQQ,DIA,IWM', limit: limit.toString() })
        ]);

        // Unite and deduplicate by title
        const allNews = [...general, ...indices];
        const seenTitles = new Set();
        const uniqueNews = allNews.filter(item => {
            const normalizedTitle = item.title.toLowerCase().trim();
            if (seenTitles.has(normalizedTitle)) return false;
            seenTitles.add(normalizedTitle);
            return true;
        });

        // Sort by date (newest first)
        uniqueNews.sort((a: any, b: any) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());

        return uniqueNews.slice(0, limit).map((item: any) => ({
            publishedDate: item.publishedDate,
            title: item.title,
            image: item.image,
            site: item.site,
            text: item.text,
            url: item.url,
            uuid: item.uuid || `news-${Math.random().toString(36).substr(2, 9)}`, // fallback if missing
            author: item.author || item.site
        }));
    } catch (error) {
        console.error('Error fetching general news:', error);
        return [];
    }
};

export const getEconomicCalendar = async (from?: string, to?: string): Promise<EconomicEvent[]> => {
    try {
        const params: Record<string, string> = {};
        if (from) params.from = from;
        if (to) params.to = to;

        const data = await fetchFMP('/economic_calendar', params);

        return data.map((item: any) => ({
            event: item.event,
            date: item.date,
            country: item.country,
            actual: item.actual,
            previous: item.previous,
            estimate: item.estimate,
            impact: item.impact,
            currency: item.currency,
            unit: item.unit
        }));
    } catch (error) {
        console.error('Error fetching economic calendar:', error);
        return [];
    }
};

// --- Sector Performance (via Sector ETFs for real-time accuracy) ---

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
    try {
        const symbols = SECTOR_ETFS.map(e => e.symbol).join(',');
        const data = await fetchFMP(`/quote/${symbols}`);
        return data.map((item: any) => {
            const etf = SECTOR_ETFS.find(e => e.symbol === item.symbol);
            return {
                sector: etf?.sector || item.name,
                changesPercentage: item.changesPercentage,
                etfSymbol: item.symbol,
                price: item.price,
            };
        });
    } catch (error) {
        console.error('Error fetching sector performance:', error);
        return [];
    }
};

// --- International Indices (via Yahoo Finance for accuracy) ---

const INTL_INDEX_SYMBOLS = ['^FCHI', '^GDAXI', '^FTSE', '^N225', '^HSI'];

async function fetchYahooIndex(symbol: string): Promise<MarketIndex | null> {
    try {
        const encoded = encodeURIComponent(symbol);
        const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=1d&interval=1d`,
            {
                cache: 'no-store',
                headers: { 'User-Agent': 'Mozilla/5.0' },
            }
        );
        if (!res.ok) return null;
        const json = await res.json();
        const meta = json.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose;
        const change = price - prevClose;
        const changesPercentage = (change / prevClose) * 100;

        return {
            symbol: meta.symbol,
            name: meta.longName || meta.shortName || symbol,
            price,
            changesPercentage,
            change,
        };
    } catch {
        return null;
    }
}

export const getInternationalIndices = async (): Promise<MarketIndex[]> => {
    try {
        const results = await Promise.all(INTL_INDEX_SYMBOLS.map(fetchYahooIndex));
        return results.filter((r): r is MarketIndex => r !== null);
    } catch (error) {
        console.error('Error fetching international indices:', error);
        return [];
    }
};

// --- Discovery stock universe ---

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

// --- Analyst Consensus (monthly buy/hold/sell counts) ---

export const getAnalystConsensus = async (symbol: string): Promise<AnalystConsensus[]> => {
    try {
        const data = await fetchFMP(`/analyst-stock-recommendations/${symbol}`);
        return data.slice(0, 6).map((item: any) => ({
            symbol: item.symbol,
            date: item.date,
            strongBuy: item.analystRatingsStrongBuy || 0,
            buy: item.analystRatingsbuy || 0,
            hold: item.analystRatingsHold || 0,
            sell: item.analystRatingsSell || 0,
            strongSell: item.analystRatingsStrongSell || 0,
        }));
    } catch (error) {
        console.error(`Error fetching analyst consensus for ${symbol}:`, error);
        return [];
    }
};

// --- Rating Changes (actual upgrades/downgrades from FMP /grade/) ---

const BULLISH_GRADES = ['buy', 'outperform', 'overweight', 'strong buy', 'positive', 'sector outperform'];
const BEARISH_GRADES = ['sell', 'underperform', 'underweight', 'strong sell', 'negative', 'reduce'];

function classifyGradeChange(from: string, to: string): 'upgrade' | 'downgrade' | null {
    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();
    const fromBull = BULLISH_GRADES.some(g => fromLower.includes(g));
    const fromBear = BEARISH_GRADES.some(g => fromLower.includes(g));
    const toBull = BULLISH_GRADES.some(g => toLower.includes(g));
    const toBear = BEARISH_GRADES.some(g => toLower.includes(g));

    if (toBull && !fromBull) return 'upgrade';
    if (toBear && !fromBear) return 'downgrade';
    if (!toBull && !toBear && fromBull) return 'downgrade';
    if (!toBull && !toBear && fromBear) return 'upgrade';
    return null;
}

export const getRecentRatingChanges = async (symbols?: string[]): Promise<RatingChange[]> => {
    const targetSymbols = symbols || DISCOVERY_SYMBOLS;
    const results: RatingChange[] = [];
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Batch-fetch company names for all symbols in one go
    const nameMap: Record<string, string> = {};
    try {
        const allSymbols = targetSymbols.join(',');
        const quotes = await fetchFMP(`/quote/${allSymbols}`);
        for (const q of quotes) {
            nameMap[q.symbol] = q.name || q.symbol;
        }
    } catch { /* fallback to symbol as name */ }

    for (const sym of targetSymbols) {
        try {
            const data = await fetchFMP(`/grade/${sym}`, { limit: '15' });
            for (const item of data) {
                if (!item.previousGrade || item.previousGrade === item.newGrade) continue;
                if (new Date(item.date) < thirtyDaysAgo) continue;

                const action = classifyGradeChange(item.previousGrade, item.newGrade);
                if (!action) continue;

                results.push({
                    symbol: item.symbol,
                    companyName: nameMap[item.symbol] || item.symbol,
                    date: item.date,
                    gradingCompany: item.gradingCompany,
                    previousGrade: item.previousGrade,
                    newGrade: item.newGrade,
                    action,
                });
            }
        } catch { /* skip */ }
        await new Promise(r => setTimeout(r, 100));
    }

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// --- Finnhub Recommendation Trends (free tier, 60 calls/min) ---

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';

export const getFinnhubRecommendation = async (symbol: string): Promise<AnalystConsensus[]> => {
    if (!FINNHUB_KEY) return [];
    try {
        const res = await fetch(
            `https://finnhub.io/api/v1/stock/recommendation?symbol=${symbol}&token=${FINNHUB_KEY}`,
            { cache: 'no-store' }
        );
        if (!res.ok) return [];
        const data = await res.json();
        if (data?.error) return [];
        return (data || []).slice(0, 6).map((item: any) => ({
            symbol: item.symbol || symbol,
            date: item.period || '',
            strongBuy: item.strongBuy || 0,
            buy: item.buy || 0,
            hold: item.hold || 0,
            sell: item.sell || 0,
            strongSell: item.strongSell || 0,
        }));
    } catch (error) {
        console.error(`Error fetching Finnhub recommendation for ${symbol}:`, error);
        return [];
    }
};

// --- Market Discovery Features ---

export const getDiscoveryStocks = () => DISCOVERY_SYMBOLS;

export const getAnalystUpgrades = async (): Promise<AnalystRating[]> => {
    try {
        // Fetch ratings for all discovery symbols
        // To avoid rate limits, we'll fetch in batches or use Promise.all carefully
        // But limiting to ~20 is fine for now
        const results = [];
        for (const sym of DISCOVERY_SYMBOLS) {
            try {
                const res = await getAnalystRatings(sym, 1);
                results.push(res);
            } catch (e) {
                // ignore
            }
            await new Promise(r => setTimeout(r, 100)); // small delay
        }

        // Flatten and filter for upgrades
        const upgrades = results.flat().filter(r => {
            // Logic: Check if it's an upgrade or a "Buy" rating
            // FMP 'newGrade' vs 'previousGrade'
            const isUpgrade = r.newGrade !== r.previousGrade &&
                (r.newGrade.includes('Buy') || r.newGrade.includes('Outperform') || r.newGrade.includes('Overweight'));

            // Also include Strong Buys even if unchanged
            const isStrongBuy = r.newGrade.includes('Strong Buy');

            return isUpgrade || isStrongBuy;
        });

        // Sort by date
        return upgrades.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
    } catch (error) {
        console.error('Error fetching discovery upgrades:', error);
        return [];
    }
};

export const getHighUpsideStocks = async (): Promise<any[]> => {
    try {
        const results = [];
        for (const sym of DISCOVERY_SYMBOLS) {
            try {
                const quote = await getStockQuote(sym).catch(() => null);
                const targets = await getPriceTargets(sym, 1).catch(() => []);
                if (quote && targets.length > 0) {
                    const target = targets[0].priceTarget;
                    const upside = ((target - quote.price) / quote.price) * 100;
                    results.push({
                        symbol: sym,
                        name: quote.name,
                        price: quote.price,
                        targetPrice: target,
                        upside: upside,
                        analyst: targets[0].analystCompany
                    });
                }
            } catch (e) {
                // ignore
            }
            await new Promise(r => setTimeout(r, 100)); // Delay between symbols
        }
        return results
            .filter((item): item is NonNullable<typeof item> => item !== null && item.upside > 10) // >10% upside
            .sort((a, b) => b.upside - a.upside)
            .slice(0, 10);

    } catch (error) {
        console.error('Error fetching high upside stocks:', error);
        return [];
    }
};

export const getDiscoveryNews = async (): Promise<NewsArticle[]> => {
    try {
        // Fetch news for discovery symbols
        const rawNews = await getMarketNews(50, DISCOVERY_SYMBOLS);

        // Filter for "Opportunity" keywords and "Market Talk" style content
        const keywords = ['opportunity', 'attractive', 'undervalued', 'potential', 'upgrade', 'buy rating', 'strong buy'];

        return rawNews.filter(item => {
            const content = (item.title + ' ' + item.text + ' ' + item.site).toLowerCase();
            const hasKeyword = keywords.some(k => content.includes(k));
            // Prioritize reliable sources or "Talk"
            const isTalk = content.includes('talk') || content.includes('insight') || content.includes('analysis');

            return hasKeyword || isTalk;
        }).slice(0, 10);
    } catch (error) {
        console.error('Error fetching discovery news:', error);
        return [];
    }
};
