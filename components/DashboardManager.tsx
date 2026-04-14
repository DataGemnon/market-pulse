'use client';

import { useState, useEffect } from 'react';
import { StockQuote, NewsArticle, WatchlistItem, AnalystConsensus, RatingChange } from '@/types';
import { getMarketNews } from '@/lib/fmp';
import { getStockQuoteAction, getBatchQuotesAction } from '@/actions/quotes';
import { getWatchlistConsensusAction, getWatchlistRatingChangesAction } from '@/actions/analyst';
import NewsFeed from '@/components/NewsFeed';
import StockSmartFeed from '@/components/StockSmartFeed';
import Watchlist from '@/components/Watchlist';
import AnalystFeed from '@/components/AnalystFeed';
import MarketBriefing from '@/components/MarketBriefing';
import InsiderTradingTracker from '@/components/InsiderTradingTracker';
import { TrendingUp, TrendingDown, Bell, X } from 'lucide-react';

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];

export default function DashboardManager() {
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [recentNews, setRecentNews] = useState<NewsArticle[]>([]);
    const [missedNews, setMissedNews] = useState<NewsArticle[]>([]);
    const [quotes, setQuotes] = useState<StockQuote[]>([]);

    // Intelligence Hub State
    const [consensus, setConsensus] = useState<AnalystConsensus[]>([]);
    const [ratingAlerts, setRatingAlerts] = useState<RatingChange[]>([]);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

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

        // Load dismissed alerts
        const dismissed = localStorage.getItem('vektora-dismissed-alerts');
        if (dismissed) {
            try {
                setDismissedAlerts(new Set(JSON.parse(dismissed)));
            } catch { /* ignore */ }
        }
    }, []);

    // 2. Fetch Data when Watchlist Changes
    useEffect(() => {
        if (watchlist.length === 0) return;

        const fetchData = async () => {
            // Fetch everything in parallel: quotes (batch), news, and analyst data
            const [batchQuotes, newsResults, consensusRes, ratingChanges] = await Promise.all([
                getBatchQuotesAction(watchlist).catch(() => [] as StockQuote[]),
                getMarketNews(50, watchlist).catch(() => [] as NewsArticle[]),
                getWatchlistConsensusAction(watchlist).catch(() => []),
                getWatchlistRatingChangesAction(watchlist).catch(() => []),
            ]);

            setQuotes(batchQuotes);

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
            setConsensus(consensusRes);
            setRatingAlerts(ratingChanges);
        };

        fetchData();

        // Persist to local storage
        localStorage.setItem('vektora-watchlist', JSON.stringify(watchlist));

    }, [watchlist]);

    const handleAddSymbol = async (symbol: string) => {
        const upper = symbol.toUpperCase();
        if (watchlist.includes(upper)) return;

        try {
            await getStockQuoteAction(upper);
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

    const handleDismissAlert = (alertKey: string) => {
        const updated = new Set(dismissedAlerts);
        updated.add(alertKey);
        setDismissedAlerts(updated);
        localStorage.setItem('vektora-dismissed-alerts', JSON.stringify([...updated]));
    };

    // Transform quotes to WatchlistItems
    const watchlistItems: WatchlistItem[] = quotes.map(q => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        changesPercentage: q.changesPercentage,
        volume: q.volume,
        currency: q.currency,
    }));

    // Filter undismissed alerts (last 7 days only)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeAlerts = ratingAlerts.filter(a => {
        const key = `${a.symbol}-${a.date}-${a.gradingCompany}`;
        return !dismissedAlerts.has(key) && new Date(a.date) >= sevenDaysAgo;
    });

    return (
        <div className="relative">
            <div className="relative z-10 space-y-8">
                {/* Section Label */}
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Your Dashboard</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                </div>

                {/* Rating Change Alerts */}
                {activeAlerts.length > 0 && (
                    <div className="space-y-2">
                        {activeAlerts.map((alert, i) => {
                            const isUpgrade = alert.action === 'upgrade';
                            const alertKey = `${alert.symbol}-${alert.date}-${alert.gradingCompany}`;
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm animate-in fade-in slide-in-from-top-2 ${
                                        isUpgrade
                                            ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                                            : 'bg-red-500/[0.08] border-red-500/20'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${isUpgrade ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                        <Bell size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isUpgrade ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'}`}>
                                                {isUpgrade ? 'Upgrade' : 'Downgrade'}
                                            </span>
                                            <span className="text-xs text-slate-500">
                                                {new Date(alert.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white">
                                            <span className="font-bold">{alert.gradingCompany}</span>
                                            {isUpgrade ? ' upgrades ' : ' downgrades '}
                                            <span className="font-bold">{alert.companyName || alert.symbol}</span>
                                            {' from '}
                                            <span className="text-slate-400">{alert.previousGrade}</span>
                                            {' to '}
                                            <span className={`font-bold ${isUpgrade ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {alert.newGrade}
                                            </span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDismissAlert(alertKey)}
                                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

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
