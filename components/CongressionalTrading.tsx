'use client';

import { useEffect, useState } from 'react';
import { CongressionalTrade } from '@/types';
import { getCongressionalTrades } from '@/lib/fmp';
import { Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function CongressionalTrading() {
    const [trades, setTrades] = useState<CongressionalTrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'senate' | 'house'>('all');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getCongressionalTrades(30);
                setTrades(data);
            } catch (e) {
                console.error('Failed to load congressional trades', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = trades.filter(t => {
        if (filter === 'senate') return t.office?.toLowerCase().includes('senate');
        if (filter === 'house') return t.office?.toLowerCase().includes('house');
        return true;
    });

    if (loading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-8 w-56 bg-white/[0.06] rounded-lg" />
                <div className="h-64 bg-white/[0.03] rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl text-white shadow-lg shadow-purple-500/15">
                    <Landmark className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Congressional Trading</h2>
                    <p className="text-sm text-slate-500">What politicians are buying and selling</p>
                </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Filter tabs */}
                <div className="p-4 border-b border-white/[0.06] flex gap-2">
                    {(['all', 'senate', 'house'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${filter === f
                                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    {filtered.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-sm">
                            No congressional trades found.
                        </div>
                    ) : (
                        <div className="p-3 space-y-2">
                            {filtered.slice(0, 15).map((trade, idx) => {
                                const isPurchase = trade.type?.toLowerCase().includes('purchase');
                                const initials = (trade.firstName?.[0] || '') + (trade.lastName?.[0] || '');

                                return (
                                    <div
                                        key={idx}
                                        className={`p-4 rounded-xl border transition-all ${isPurchase
                                            ? 'border-l-2 border-l-emerald-500 border-y-transparent border-r-transparent hover:bg-emerald-500/[0.03]'
                                            : 'border-l-2 border-l-red-500 border-y-transparent border-r-transparent hover:bg-red-500/[0.03]'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
                                                {initials}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="text-sm font-bold text-white">
                                                        {trade.firstName} {trade.lastName}
                                                    </span>
                                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${trade.office?.toLowerCase().includes('senate')
                                                        ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                                                        : 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                                                        }`}>
                                                        {trade.office}
                                                    </span>
                                                    {trade.owner && trade.owner !== 'Self' && (
                                                        <span className="text-[9px] text-slate-600 bg-white/[0.03] px-1.5 py-0.5 rounded">
                                                            {trade.owner}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-2 mb-1">
                                                    {trade.symbol && (
                                                        <span className="text-xs font-bold text-white bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.06]">
                                                            {trade.symbol}
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${isPurchase
                                                        ? 'bg-emerald-500/15 text-emerald-400'
                                                        : 'bg-red-500/15 text-red-400'
                                                        }`}>
                                                        {isPurchase ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                                        {trade.type}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                                    <span className="font-medium">{trade.amount}</span>
                                                    <span>
                                                        {new Date(trade.transactionDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </div>

                                                {trade.assetDescription && !trade.symbol && (
                                                    <div className="text-[11px] text-slate-600 mt-1 truncate">
                                                        {trade.assetDescription}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
