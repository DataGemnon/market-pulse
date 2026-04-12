import { StockQuote, MarketIndex, NewsArticle, HistoricalPrice, AnalystRating, EarningsCall, PriceTarget, SectorPerformance, InsiderTrade, CongressionalTrade, AnalystConsensus, RatingChange } from '@/types';

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

export const getStockQuote = async (symbol: string): Promise<StockQuote> => {
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
        };
    } catch (error) {
        console.error(`Error fetching quote for ${symbol}:`, error);
        // Return a fallback or rethrow depending on desired behavior. 
        // For now, rethrowing to be handled by caller or returning a skeleton object if critical
        throw error;
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
    try {
        let endpoint = `/historical-chart/1hour/${symbol}`; // default for shorter ranges
        // FMP ranges: 1min, 5min, 15min, 30min, 1hour, 4hour
        // For daily data: /historical-price-full/${symbol}

        // Mapping range to FMP logic
        if (range === '1D') {
            // 1D usually requires intraday. 
            endpoint = `/historical-chart/5min/${symbol}`;
        } else if (range === '1W' || range === '1M') {
            endpoint = `/historical-chart/1hour/${symbol}`;
        } else {
            // For longer ranges, use daily prices
            // endpoint = `/historical-price-full/${symbol}`;
            // But the interface for HistoricalPrice in types might expect specific fields. 
            // Let's stick to the chart endpoint if possible or normalize.
            // However, historical-chart endpoint returns array of {date, open, low, high, close, volume} directly
            // historical-price-full returns object with historical array.

            // Simplification for this task: Use 4hour for longer ranges to get enough data points without too much weight
            endpoint = `/historical-chart/4hour/${symbol}`;
        }

        const data = await fetchFMP(endpoint);

        // FMP returns data sorted new to old usually. Reverse for chart if needed, but charts often take it as is.
        // Let's ensure it matches HistoricalPrice interface { date: string, close: number }

        return data.map((item: any) => ({
            date: item.date,
            close: item.close
        })).reverse(); // Charting libs often want Old -> New

    } catch (error) {
        console.error('Error fetching historical chart:', error);
        return [];
    }
};

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

// --- Insider Trading ---

export const getInsiderTrading = async (symbol: string, limit: number = 10): Promise<InsiderTrade[]> => {
    try {
        const data = await fetchFMP('/insider-trading', { symbol, limit: limit.toString() });
        return data.map((item: any) => ({
            symbol: item.symbol,
            filingDate: item.filingDate,
            transactionDate: item.transactionDate,
            reportingName: item.reportingName,
            typeOfOwner: item.typeOfOwner,
            acquistionOrDisposition: item.acquistionOrDisposition,
            transactionType: item.transactionType,
            securitiesTransacted: item.securitiesTransacted,
            price: item.price,
            securityName: item.securityName,
            link: item.link || '',
        }));
    } catch (error) {
        console.error(`Error fetching insider trading for ${symbol}:`, error);
        return [];
    }
};

// --- Congressional Trading ---

export const getCongressionalTrades = async (limit: number = 30): Promise<CongressionalTrade[]> => {
    try {
        const data = await fetchFMP('/senate-trading', { limit: limit.toString() });
        return data.map((item: any) => ({
            firstName: item.firstName,
            lastName: item.lastName,
            office: item.office,
            link: item.link || '',
            dateRecieved: item.dateRecieved,
            transactionDate: item.transactionDate,
            owner: item.owner,
            assetDescription: item.assetDescription,
            assetType: item.assetType,
            type: item.type,
            amount: item.amount,
            symbol: item.symbol || '',
        }));
    } catch (error) {
        console.error('Error fetching congressional trades:', error);
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
