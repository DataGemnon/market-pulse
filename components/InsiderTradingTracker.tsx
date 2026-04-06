'use client';

import { useEffect, useState } from 'react';
import { InsiderTrade } from '@/types';
import { getInsiderTrading } from '@/lib/fmp';
import { UserCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface InsiderTradingTrackerProps {
    watchlist: string[];
}

export default function InsiderTradingTracker({ watchlist }: InsiderTradingTrackerProps) {
    const [trades, setTrades] = useState<InsiderTrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'buys' | 'sells'>('all');

    useEffect(() => {
        if (watchlist.length === 0) return;

        const load = async () => {
            setLoading(true);
            const allTrades: InsiderTrade[] = [];
            for (const sym of watchlist) {
                try {
                    const data = await getInsiderTrading(sym, 5);
                    allTrades.push(...data);
                } catch (e) {
                    // skip
                }
                await new Promise(r => setTimeout(r, 250));
            }
            // Sort by date, limit to 15
            allTrades.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
            setTrades(allTrades.slice(0, 15));
            setLoading(false);
        };
        load();
    }, [watchlist]);

    const filtered = trades.filter(t => {
        if (filter === 'buys') return t.acquistionOrDisposition === 'A';
        if (filter === 'sells') return t.acquistionOrDisposition === 'D';
        return true;
    });

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.1]">
            <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <UserCheck size={18} className="text-amber-400" />
                        Insider Trading
                    </h3>
                </div>
                <div className="flex gap-2">
                    {(['all', 'buys', 'sells'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-[11px] font-bold px-3 py-1 rounded-lg uppercase tracking-wider transition-all ${filter === f
                                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                                : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="p-5 space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                        No insider trades found for your watchlist.
                    </div>
                ) : (
                    <div className="p-3 space-y-2">
                        {filtered.map((trade, idx) => {
                            const isBuy = trade.acquistionOrDisposition === 'A';
                            const totalValue = trade.securitiesTransacted * trade.price;
                            const isLarge = totalValue > 1_000_000;

                            return (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-xl border transition-all ${isBuy
                                        ? 'border-l-2 border-l-emerald-500 border-y-transparent border-r-transparent bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06]'
                                        : 'border-l-2 border-l-red-500 border-y-transparent border-r-transparent bg-red-500/[0.03] hover:bg-red-500/[0.06]'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{trade.symbol}</span>
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${isBuy
                                                ? 'bg-emerald-500/15 text-emerald-400'
                                                : 'bg-red-500/15 text-red-400'
                                                }`}>
                                                {isBuy ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                {isBuy ? 'BUY' : 'SELL'}
                                            </span>
                                            {isLarge && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-md border border-amber-500/20">
                                                    NOTABLE
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-600">
                                            {new Date(trade.transactionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mb-1">{trade.reportingName}</div>
                                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                        <span>{trade.securitiesTransacted.toLocaleString()} shares</span>
                                        <span>@ ${trade.price.toFixed(2)}</span>
                                        <span className="font-semibold text-slate-400">
                                            ${totalValue >= 1_000_000
                                                ? (totalValue / 1_000_000).toFixed(1) + 'M'
                                                : totalValue >= 1000
                                                    ? (totalValue / 1000).toFixed(0) + 'K'
                                                    : totalValue.toFixed(0)
                                            }
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
