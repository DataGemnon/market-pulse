'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StockQuote, NewsArticle, WatchlistItem, AnalystConsensus, RatingChange, Position, UpcomingEarnings, PriceAlert } from '@/types';
import { getMarketNews } from '@/lib/fmp';
import { getStockQuoteAction, getBatchQuotesAction } from '@/actions/quotes';
import { getWatchlistConsensusAction, getWatchlistRatingChangesAction } from '@/actions/analyst';
import { getWatchlistEarningsAction } from '@/actions/earnings';
// AI calls go via API routes (more reliable on Vercel than server actions)
async function fetchStockRecaps(quotes: StockQuote[], newsMap: Record<string, string[]>): Promise<Record<string, string>> {
    const res = await fetch('/api/stock-recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes, newsMap }),
    });
    if (!res.ok) return {};
    return res.json();
}

async function fetchSentimentSummaries(consensus: AnalystConsensus[]): Promise<Record<string, string>> {
    const res = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consensus }),
    });
    if (!res.ok) return {};
    return res.json();
}
import { sendNotification } from '@/lib/notifications';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import {
    getWatchlistFromDB, saveWatchlistToDB, addSymbolToDB, removeSymbolFromDB,
    getPositionsFromDB, upsertPositionToDB, deletePositionFromDB,
    getAlertsFromDB, insertAlertToDB, updateAlertInDB, deleteAlertFromDB,
    migrateLocalStorageToDB,
} from '@/actions/db';
import StockDiscovery from '@/components/StockDiscovery';
import MorningBrief from '@/components/MorningBrief';
import EarningsPreviewPanel from '@/components/EarningsPreviewPanel';
import { useMorningBriefPreference } from '@/hooks/useMorningBriefPreference';
import type { EarningsPreviewResult } from '@/actions/earnings-preview';
import type { PersonalImpactResult } from '@/actions/personal-impact';

async function fetchEarningsPreviews(earnings: UpcomingEarnings[]): Promise<EarningsPreviewResult[]> {
    const res = await fetch('/api/earnings-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earnings }),
    });
    if (!res.ok) return [];
    return res.json();
}

async function fetchPersonalImpact(quotes: StockQuote[]): Promise<PersonalImpactResult | null> {
    const res = await fetch('/api/personal-impact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotes }),
    });
    if (!res.ok) return null;
    return res.json();
}
import NewsFeed from '@/components/NewsFeed';
import StockSmartFeed from '@/components/StockSmartFeed';
import Watchlist from '@/components/Watchlist';
import AnalystFeed from '@/components/AnalystFeed';
import MarketBriefing from '@/components/MarketBriefing';
import EarningsCalendar from '@/components/EarningsCalendar';
import { TrendingUp, TrendingDown, Bell, BellRing, X, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

function formatCurrency(value: number, currency?: string): string {
    const c = currency || 'USD';
    const sym = c === 'EUR' ? '€' : c === 'GBP' || c === 'GBp' ? '£' : c === 'JPY' ? '¥' : c === 'USD' ? '$' : `${c} `;
    return `${sym}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];
const LS_WATCHLIST = 'augur-watchlist';
const LS_POSITIONS = 'augur-positions';
const LS_ALERTS = 'augur-price-alerts';
const LS_DISMISSED = 'augur-dismissed-alerts';

export default function DashboardManager() {
    const [user, setUser] = useState<User | null>(null);
    const [watchlist, setWatchlist] = useState<string[]>([]);
    const [positions, setPositions] = useState<Record<string, Position>>({});
    const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);
    const [recentlyTriggered, setRecentlyTriggered] = useState<PriceAlert[]>([]);
    const [recentNews, setRecentNews] = useState<NewsArticle[]>([]);
    const [missedNews, setMissedNews] = useState<NewsArticle[]>([]);
    const [quotes, setQuotes] = useState<StockQuote[]>([]);
    const [earnings, setEarnings] = useState<UpcomingEarnings[]>([]);
    const [consensus, setConsensus] = useState<AnalystConsensus[]>([]);
    const [ratingAlerts, setRatingAlerts] = useState<RatingChange[]>([]);
    const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
    const [stockRecaps, setStockRecaps] = useState<Record<string, string>>({});
    const [sentimentSummaries, setSentimentSummaries] = useState<Record<string, string>>({});
    const [earningsPreviews, setEarningsPreviews] = useState<EarningsPreviewResult[]>([]);
    const [earningsPreviewLoading, setEarningsPreviewLoading] = useState(false);
    const [personalImpact, setPersonalImpact] = useState<PersonalImpactResult | null>(null);
    const [impactDismissed, setImpactDismissed] = useState(false);
    const { enabled: briefEnabled } = useMorningBriefPreference();

    // Track which alert IDs we've notified to avoid duplicate browser notifications
    const notifiedAlertIds = useRef<Set<string>>(new Set());
    // Prevent double-migration on fast auth state changes
    const migrationDone = useRef(false);

    // ──────────────────────────────────────────────────
    // Helpers: read/write localStorage
    // ──────────────────────────────────────────────────
    const readLocalStorage = useCallback(() => {
        const wl = (() => {
            try {
                const s = localStorage.getItem(LS_WATCHLIST);
                if (!s) return DEFAULT_WATCHLIST;
                const p = JSON.parse(s);
                return Array.isArray(p) && p.length > 0 ? p : DEFAULT_WATCHLIST;
            } catch { return DEFAULT_WATCHLIST; }
        })();

        const pos = (() => {
            try {
                const s = localStorage.getItem(LS_POSITIONS);
                if (!s) return {} as Record<string, Position>;
                const p = JSON.parse(s);
                return (p && typeof p === 'object') ? p : {};
            } catch { return {} as Record<string, Position>; }
        })();

        const alerts = (() => {
            try {
                const s = localStorage.getItem(LS_ALERTS);
                if (!s) return [] as PriceAlert[];
                const p = JSON.parse(s);
                return Array.isArray(p) ? p : [];
            } catch { return [] as PriceAlert[]; }
        })();

        const dismissed = (() => {
            try {
                const s = localStorage.getItem(LS_DISMISSED);
                return s ? new Set<string>(JSON.parse(s)) : new Set<string>();
            } catch { return new Set<string>(); }
        })();

        return { wl, pos, alerts, dismissed };
    }, []);

    // ──────────────────────────────────────────────────
    // Bootstrap: auth listener + initial data load
    // ──────────────────────────────────────────────────
    useEffect(() => {
        // If Supabase isn't configured, load from localStorage only
        if (!isSupabaseConfigured) {
            const { wl, pos, alerts, dismissed } = readLocalStorage();
            setWatchlist(wl);
            setPositions(pos);
            setPriceAlerts(alerts);
            setDismissedAlerts(dismissed);
            alerts.forEach((a: PriceAlert) => { if (a.triggered) notifiedAlertIds.current.add(a.id); });
            return;
        }

        const supabase = createClient();

        async function bootstrap(currentUser: User | null) {
            if (currentUser) {
                // ── Logged in: load from DB ──
                const [dbWatchlist, dbPositions, dbAlerts] = await Promise.all([
                    getWatchlistFromDB(),
                    getPositionsFromDB(),
                    getAlertsFromDB(),
                ]);

                // Run migration if needed (only if DB is empty)
                if (!migrationDone.current) {
                    migrationDone.current = true;
                    const { wl: lsWl, pos: lsPos, alerts: lsAlerts } = readLocalStorage();
                    if (dbWatchlist.length === 0 && (lsWl !== DEFAULT_WATCHLIST || Object.keys(lsPos).length > 0 || lsAlerts.length > 0)) {
                        await migrateLocalStorageToDB(lsWl, lsPos, lsAlerts);
                        // Reload after migration
                        const [mWl, mPos, mAlerts] = await Promise.all([
                            getWatchlistFromDB(),
                            getPositionsFromDB(),
                            getAlertsFromDB(),
                        ]);
                        setWatchlist(mWl.length > 0 ? mWl : DEFAULT_WATCHLIST);
                        setPositions(mPos);
                        setPriceAlerts(mAlerts);
                        mAlerts.forEach(a => { if (a.triggered) notifiedAlertIds.current.add(a.id); });
                        return;
                    }
                }

                setWatchlist(dbWatchlist.length > 0 ? dbWatchlist : DEFAULT_WATCHLIST);
                setPositions(dbPositions);
                setPriceAlerts(dbAlerts);
                dbAlerts.forEach(a => { if (a.triggered) notifiedAlertIds.current.add(a.id); });
            } else {
                // ── Not logged in: load from localStorage ──
                const { wl, pos, alerts, dismissed } = readLocalStorage();
                setWatchlist(wl);
                setPositions(pos);
                setPriceAlerts(alerts);
                setDismissedAlerts(dismissed);
                alerts.forEach((a: PriceAlert) => { if (a.triggered) notifiedAlertIds.current.add(a.id); });
            }
        }

        // Get initial session
        supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
            setUser(currentUser);
            bootstrap(currentUser);
        });

        // Listen for auth changes (sign-in / sign-out)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            migrationDone.current = false; // allow migration check on sign-in
            bootstrap(currentUser);
        });

        return () => subscription.unsubscribe();
    }, [readLocalStorage]);

    // ──────────────────────────────────────────────────
    // Fetch market data when watchlist changes
    // ──────────────────────────────────────────────────
    useEffect(() => {
        if (watchlist.length === 0) return;

        const fetchData = async () => {
            const [batchQuotes, newsResults, consensusRes, ratingChanges, earningsRes] = await Promise.all([
                getBatchQuotesAction(watchlist).catch(() => [] as StockQuote[]),
                getMarketNews(50, watchlist).catch(() => [] as NewsArticle[]),
                getWatchlistConsensusAction(watchlist).catch(() => []),
                getWatchlistRatingChangesAction(watchlist).catch(() => []),
                getWatchlistEarningsAction(watchlist).catch(() => [] as UpcomingEarnings[]),
            ]);

            setQuotes(batchQuotes);
            setEarnings(earningsRes);

            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

            const recent: NewsArticle[] = [];
            const missed: NewsArticle[] = [];
            newsResults.forEach(article => {
                const pubDate = new Date(article.publishedDate);
                if (pubDate >= oneDayAgo) recent.push(article);
                else if (pubDate >= twoDaysAgo) missed.push(article);
            });

            setRecentNews(recent);
            setMissedNews(missed);
            setConsensus(consensusRes);
            setRatingAlerts(ratingChanges);

            // ── Non-blocking: generate "What happened today?" recaps ──
            const newsMap: Record<string, string[]> = {};
            newsResults.forEach(article => {
                if (!article.symbol) return;
                if (new Date(article.publishedDate) < todayStart) return;
                if (!newsMap[article.symbol]) newsMap[article.symbol] = [];
                newsMap[article.symbol].push(article.title);
            });
            fetchStockRecaps(batchQuotes, newsMap).then(setStockRecaps).catch(() => {});
            fetchSentimentSummaries(consensusRes).then(setSentimentSummaries).catch(() => {});

            // ── Non-blocking: earnings preview for today/tomorrow ──
            if (earningsRes.length > 0) {
                setEarningsPreviewLoading(true);
                fetchEarningsPreviews(earningsRes)
                    .then(setEarningsPreviews)
                    .catch(() => {})
                    .finally(() => setEarningsPreviewLoading(false));
            }

            // ── Non-blocking: personalized market impact ──
            setImpactDismissed(false);
            fetchPersonalImpact(batchQuotes).then(setPersonalImpact).catch(() => {});
        };

        fetchData();
    }, [watchlist]);

    // ──────────────────────────────────────────────────
    // Persist localStorage (for non-auth users)
    // ──────────────────────────────────────────────────
    const persistLS = useCallback((key: string, value: unknown) => {
        if (!user) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    }, [user]);

    // ──────────────────────────────────────────────────
    // Watchlist mutations
    // ──────────────────────────────────────────────────
    const handleAddSymbol = async (symbol: string) => {
        const upper = symbol.toUpperCase();
        if (watchlist.includes(upper)) return;
        try {
            await getStockQuoteAction(upper);
            const newWatchlist = [...watchlist, upper];
            setWatchlist(newWatchlist);
            if (user) {
                await addSymbolToDB(upper, newWatchlist.length - 1);
            } else {
                localStorage.setItem(LS_WATCHLIST, JSON.stringify(newWatchlist));
            }
        } catch {
            alert('Invalid symbol or unable to fetch data');
        }
    };

    const handleRemoveSymbol = async (symbol: string) => {
        const newWatchlist = watchlist.filter(s => s !== symbol);
        setWatchlist(newWatchlist);

        // Remove position
        if (positions[symbol]) {
            const next = { ...positions };
            delete next[symbol];
            setPositions(next);
            if (user) await deletePositionFromDB(symbol);
            else localStorage.setItem(LS_POSITIONS, JSON.stringify(next));
        }

        // Remove alerts
        const remaining = priceAlerts.filter(a => a.symbol !== symbol);
        if (remaining.length !== priceAlerts.length) {
            setPriceAlerts(remaining);
            if (user) {
                const toDelete = priceAlerts.filter(a => a.symbol === symbol);
                await Promise.all(toDelete.map(a => deleteAlertFromDB(a.id)));
            } else {
                localStorage.setItem(LS_ALERTS, JSON.stringify(remaining));
            }
        }
        setRecentlyTriggered(prev => prev.filter(a => a.symbol !== symbol));

        if (user) {
            await removeSymbolFromDB(symbol);
        } else {
            localStorage.setItem(LS_WATCHLIST, JSON.stringify(newWatchlist));
        }
    };

    // ──────────────────────────────────────────────────
    // Position mutations
    // ──────────────────────────────────────────────────
    const handleSetPosition = async (symbol: string, position: Position | null) => {
        const next = { ...positions };
        if (position === null) {
            delete next[symbol];
            if (user) await deletePositionFromDB(symbol);
        } else {
            next[symbol] = position;
            if (user) await upsertPositionToDB(symbol, position);
        }
        setPositions(next);
        persistLS(LS_POSITIONS, next);
    };

    // ──────────────────────────────────────────────────
    // Alert mutations
    // ──────────────────────────────────────────────────
    const persistAlerts = useCallback(async (alerts: PriceAlert[]) => {
        setPriceAlerts(alerts);
        persistLS(LS_ALERTS, alerts);
    }, [persistLS]);

    const handleAddAlert = async (input: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => {
        const newAlert: PriceAlert = {
            ...input,
            id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            createdAt: new Date().toISOString(),
            triggered: false,
        };
        const updated = [...priceAlerts, newAlert];
        await persistAlerts(updated);
        if (user) await insertAlertToDB(newAlert);
    };

    const handleRemoveAlert = async (alertId: string) => {
        await persistAlerts(priceAlerts.filter(a => a.id !== alertId));
        notifiedAlertIds.current.delete(alertId);
        setRecentlyTriggered(prev => prev.filter(a => a.id !== alertId));
        if (user) await deleteAlertFromDB(alertId);
    };

    const handleDismissTriggered = (alertId: string) => {
        setRecentlyTriggered(prev => prev.filter(a => a.id !== alertId));
    };

    // ──────────────────────────────────────────────────
    // Price alert crossing detection
    // ──────────────────────────────────────────────────
    useEffect(() => {
        if (quotes.length === 0 || priceAlerts.length === 0) return;

        const quoteMap = new Map(quotes.map(q => [q.symbol, q]));
        const justTriggered: PriceAlert[] = [];
        let mutated = false;

        const updatedAlerts = priceAlerts.map(alert => {
            if (alert.triggered) return alert;
            const q = quoteMap.get(alert.symbol);
            if (!q) return alert;

            const crossed =
                (alert.type === 'above' && q.price >= alert.price) ||
                (alert.type === 'below' && q.price <= alert.price);

            if (!crossed) return alert;

            mutated = true;
            const triggered: PriceAlert = {
                ...alert,
                triggered: true,
                triggeredAt: new Date().toISOString(),
                triggeredPrice: q.price,
            };
            justTriggered.push(triggered);

            if (!notifiedAlertIds.current.has(alert.id)) {
                notifiedAlertIds.current.add(alert.id);
                sendNotification({
                    title: `${q.symbol} price alert`,
                    body: `${q.name} ${alert.type === 'above' ? 'rose above' : 'fell below'} ${formatCurrency(alert.price, q.currency)} (now ${formatCurrency(q.price, q.currency)})`,
                    tag: alert.id,
                });
            }

            return triggered;
        });

        if (mutated) {
            persistAlerts(updatedAlerts);
            // Persist triggered state to DB
            if (user) {
                justTriggered.forEach(a => updateAlertInDB(a));
            }
            setRecentlyTriggered(prev => [...prev, ...justTriggered]);
        }
    }, [quotes]); // eslint-disable-line react-hooks/exhaustive-deps

    // ──────────────────────────────────────────────────
    // Rating change dismissals
    // ──────────────────────────────────────────────────
    const handleDismissAlert = (alertKey: string) => {
        const updated = new Set(dismissedAlerts);
        updated.add(alertKey);
        setDismissedAlerts(updated);
        localStorage.setItem(LS_DISMISSED, JSON.stringify([...updated]));
    };

    // ──────────────────────────────────────────────────
    // Derived data
    // ──────────────────────────────────────────────────
    const watchlistItems: WatchlistItem[] = quotes.map(q => ({
        symbol: q.symbol,
        name: q.name,
        price: q.price,
        changesPercentage: q.changesPercentage,
        volume: q.volume,
        currency: q.currency,
        position: positions[q.symbol],
    }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeAlerts = ratingAlerts.filter(a => {
        const key = `${a.symbol}-${a.date}-${a.gradingCompany}`;
        return !dismissedAlerts.has(key) && new Date(a.date) >= sevenDaysAgo;
    });

    // ──────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────
    return (
        <div className="relative">
            <div className="relative z-10 space-y-8">
                {/* Section Label */}
                <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
                    <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Your Dashboard</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-white/10 to-transparent" />
                </div>

                {/* Triggered Price Alerts */}
                {recentlyTriggered.length > 0 && (
                    <div className="space-y-2">
                        {recentlyTriggered.map(alert => {
                            const q = quotes.find(qq => qq.symbol === alert.symbol);
                            const isAbove = alert.type === 'above';
                            return (
                                <div
                                    key={alert.id}
                                    className={`flex items-center gap-3 p-4 rounded-xl border backdrop-blur-sm animate-in fade-in slide-in-from-top-2 ${
                                        isAbove
                                            ? 'bg-emerald-500/[0.08] border-emerald-500/20'
                                            : 'bg-red-500/[0.08] border-red-500/20'
                                    }`}
                                >
                                    <div className={`p-2 rounded-lg flex-shrink-0 ${isAbove ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                        <BellRing size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${isAbove ? 'text-emerald-400 bg-emerald-500/15' : 'text-red-400 bg-red-500/15'}`}>
                                                Price Alert
                                            </span>
                                            {isAbove ? <ArrowUp size={11} className="text-emerald-400" /> : <ArrowDown size={11} className="text-red-400" />}
                                        </div>
                                        <p className="text-sm text-white">
                                            <span className="font-bold">{q?.name || alert.symbol}</span>
                                            {isAbove ? ' rose above ' : ' fell below '}
                                            <span className="font-bold tabular-nums">{formatCurrency(alert.price, q?.currency)}</span>
                                            {alert.triggeredPrice != null && (
                                                <>
                                                    {' — now '}
                                                    <span className={`font-bold tabular-nums ${isAbove ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {formatCurrency(alert.triggeredPrice, q?.currency)}
                                                    </span>
                                                </>
                                            )}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDismissTriggered(alert.id)}
                                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

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

                {/* Personalized Market Impact */}
                {personalImpact && !impactDismissed && (
                    <div
                        className={`flex items-start gap-3 p-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 ${
                            personalImpact.severity === 'positive'
                                ? 'bg-emerald-500/[0.06] border-emerald-500/20'
                                : personalImpact.severity === 'negative'
                                ? 'bg-red-500/[0.06] border-red-500/20'
                                : 'bg-cyan-500/[0.06] border-cyan-500/15'
                        }`}
                    >
                        <div
                            className={`p-2 rounded-lg flex-shrink-0 ${
                                personalImpact.severity === 'positive'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : personalImpact.severity === 'negative'
                                    ? 'bg-red-500/15 text-red-400'
                                    : 'bg-cyan-500/15 text-cyan-400'
                            }`}
                        >
                            <Sparkles size={15} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                What this means for you
                            </p>
                            <p className="text-sm text-slate-200 leading-relaxed">{personalImpact.brief}</p>
                        </div>
                        <button
                            onClick={() => setImpactDismissed(true)}
                            className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}

                {/* Morning Brief */}
                <MorningBrief watchlist={watchlist} enabled={briefEnabled} />

                {/* Earnings Preview */}
                <EarningsPreviewPanel
                    previews={earningsPreviews}
                    loading={earningsPreviewLoading}
                />

                {/* Discover Investments */}
                <StockDiscovery watchlist={watchlist} onAddSymbol={handleAddSymbol} />

                {/* Top: Watchlist */}
                <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                    <Watchlist
                        items={watchlistItems}
                        alerts={priceAlerts}
                        recaps={stockRecaps}
                        onAddSymbol={handleAddSymbol}
                        onRemoveSymbol={handleRemoveSymbol}
                        onSetPosition={handleSetPosition}
                        onAddAlert={handleAddAlert}
                        onRemoveAlert={handleRemoveAlert}
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
                        <EarningsCalendar earnings={earnings} />
                        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.1]">
                            <AnalystFeed consensus={consensus} summaries={sentimentSummaries} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
