'use client';

import { useEffect, useState } from 'react';
import { RatingChange } from '@/types';
import { getRecentRatingChangesAction } from '@/actions/analyst';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

export default function AnalystDiscovery() {
    const [changes, setChanges] = useState<RatingChange[]>([]);
    const [filter, setFilter] = useState<'all' | 'upgrades' | 'downgrades'>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getRecentRatingChangesAction();
                setChanges(data);
            } catch (e) {
                console.error("Failed to load rating changes", e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const filtered = filter === 'all' ? changes
        : filter === 'upgrades' ? changes.filter(c => c.action === 'upgrade')
        : changes.filter(c => c.action === 'downgrade');

    if (loading) {
        return (
            <div className="animate-pulse space-y-8 w-full">
                <div className="h-64 bg-white/[0.03] rounded-2xl w-full"></div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Section header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl text-white shadow-lg shadow-emerald-500/15">
                    <Target className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        Rating Changes
                    </h2>
                    <p className="text-sm text-slate-500">Recent broker upgrades & downgrades</p>
                </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] relative overflow-hidden transition-all duration-500 hover:border-white/[0.1]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

                <div className="p-6 sm:p-8">
                    {/* Filter tabs */}
                    <div className="flex items-center gap-2 mb-6">
                        {(['all', 'upgrades', 'downgrades'] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setFilter(tab)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${filter === tab
                                    ? tab === 'upgrades' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                                    : tab === 'downgrades' ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                                    : 'bg-white/[0.08] text-white border border-white/[0.1]'
                                    : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                }`}
                            >
                                {tab === 'all' ? `All (${changes.length})` :
                                 tab === 'upgrades' ? `Upgrades (${changes.filter(c => c.action === 'upgrade').length})` :
                                 `Downgrades (${changes.filter(c => c.action === 'downgrade').length})`}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filtered.length === 0 ? (
                            <p className="text-slate-500 text-sm col-span-full">No rating changes found.</p>
                        ) : (
                            filtered.slice(0, 12).map((c, i) => {
                                const isUpgrade = c.action === 'upgrade';
                                return (
                                    <div
                                        key={i}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-300 hover:bg-white/[0.04] ${
                                            isUpgrade
                                                ? 'bg-emerald-500/[0.03] border-emerald-500/10 hover:border-emerald-500/20'
                                                : 'bg-red-500/[0.03] border-red-500/10 hover:border-red-500/20'
                                        }`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2.5 mb-1.5">
                                                <div className={`p-1.5 rounded-lg ${isUpgrade ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                                                    {isUpgrade ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                </div>
                                                <span className="text-base font-bold text-white">{c.companyName}</span>
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${isUpgrade ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                                    {c.action}
                                                </span>
                                            </div>
                                            <div className="text-sm text-slate-400 pl-9">
                                                <span className="font-medium text-slate-300">{c.gradingCompany}</span>
                                                {' · '}
                                                <span className="text-slate-500">{c.previousGrade}</span>
                                                <span className="text-slate-600 mx-1">→</span>
                                                <span className={`font-bold ${isUpgrade ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {c.newGrade}
                                                </span>
                                                <span className="text-[10px] text-slate-600 ml-2">({c.symbol})</span>
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-medium text-slate-600 bg-white/[0.03] px-2.5 py-1 rounded-lg flex-shrink-0 ml-3">
                                            {new Date(c.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
