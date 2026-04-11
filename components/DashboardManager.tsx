'use client';

import { useState, useEffect } from 'react';
import { StockQuote, NewsArticle, WatchlistItem, AnalystConsensus } from '@/types';
import { getStockQuote, getMarketNews, getAnalystConsensus } from '@/lib/fmp';
import NewsFeed from '@/components/NewsFeed';
import StockSmartFeed from '@/components/StockSmartFeed';
import Watchlist from '@/components/Watchlist';
import AnalystFeed from '@/components/AnalystFeed';
import MarketBriefing from '@/components/MarketBriefing';
import InsiderTradingTracker from '@/components/InsiderTradingTracker';

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];

export default function DashboardManager() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [recentNews, setRecentNews] = useState<NewsArticle[]>([]);
    const [missedNews, setMissedNews] = useState<NewsArticle[]>([]);
    const [quotes, setQuotes] = useState<StockQuote[]>([]);

    // Intelligence Hub State
    const [consensus, setConsensus] = useState<AnalystConsensus[]>([]);

    // 1. Load Watchlist from LocalStorage on Mount
    useEffect(() => {
        const stored = localStorage.getItem('vektora-watchlist');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setWatchlist(parsed);
                } else {
                    setWatchlist(DEFAULT_WATCHLIST);
                }
            } catch (e) {
                setWatchlist(DEFAULT_WATCHLIST);
            }
        } else {
            setWatchlist(DEFAULT_WATCHLIST);
        }
    }, []);

    // 2. Fetch Data when Watchlist Changes
    useEffect(() => {
        if (watchlist.length === 0) return;

        const fetchData = async () => {
            // Fetch Quotes Sequentially to avoid rate limits
            const validQuotes: StockQuote[] = [];
            for (const sym of watchlist) {
                try {
                    const q = await getStockQuote(sym);
                    validQuotes.push(q);
                } catch (e) {
                    console.error('Error fetching quote for', sym, e);
                }
                // Small delay to prevent rate limiting
                await new Promise(r => setTimeout(r, 250));
            }
            setQuotes(validQuotes);

            // Fetch News (filtered by watchlist)
            const newsResults = await getMarketNews(50, watchlist); // Fetch more to allow splitting

            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

            const recent: NewsArticle[] = [];
            const missed: NewsArticle[] = [];

            newsResults.forEach(article => {
                const pubDate = new Date(article.publishedDate);
                if (pubDate >= oneDayAgo) {
                    recent.push(article);
                } else if (pubDate >= twoDaysAgo) {
                    missed.push(article);
                }
            });

            setRecentNews(recent);
            setMissedNews(missed);

            // Fetch Analyst Consensus for watchlist stocks
            const consensusRes: AnalystConsensus[] = [];
            for (const sym of watchlist) {
                try {
                    const data = await getAnalystConsensus(sym);
                    if (data.length > 0) consensusRes.push(data[0]);
                } catch (e) {
                    console.error('Error fetching consensus for', sym, e);
                }
                await new Promise(r => setTimeout(r, 250));
            }
            setConsensus(consensusRes);
        };

        fetchData();

        // Persist to local storage
        localStorage.setItem('vektora-watchlist', JSON.stringify(watchlist));

    }, [watchlist]);

    const handleAddSymbol = async (symbol: string) => {
        const upper = symbol.toUpperCase();
        if (watchlist.includes(upper)) return;

        // Validate symbol exists by trying to fetch quote
        try {
            await getStockQuote(upper);
            const newWatchlist = [...watchlist, upper];
            setWatchlist(newWatchlist);
        } catch (error) {
            alert('Invalid symbol or unable to fetch data');
        }
    };

    const handleRemoveSymbol = (symbol: string) => {
        const newWatchlist = watchlist.filter(s => s !== symbol);
        setWatchlist(newWatchlist);
    };

    // Transform quotes to WatchlistItems
    const watchlistItems: WatchlistItem[] = quotes.map(q => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        changesPercentage: q.changesPercentage,
        volume: q.volume
    }));

    return (
        <div className="relative">
            <div className="relative z-10 space-y-8">
                {/* Section Label */}
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Your Dashboard</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                </div>

                {/* Top: Watchlist */}
                <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                    <Watchlist
                        items={watchlistItems}
                        onAddSymbol={handleAddSymbol}
                        onRemoveSymbol={handleRemoveSymbol}
                    />
                </div>

                {/* Bento Grid Layout */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Main Content Area */}
                    <div className="xl:col-span-8 space-y-6">
                        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.1]">
                            <StockSmartFeed watchlist={watchlist} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="xl:col-span-4 space-y-6">
                        <MarketBriefing news={recentNews} />

                        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.1]">
                            <AnalystFeed consensus={consensus} />
                        </div>

                        <InsiderTradingTracker watchlist={watchlist} />
                    </div>
                </div>
            </div>
        </div>
    );
}
