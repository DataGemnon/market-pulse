'use client';

import { useEffect, useState } from 'react';
import { AnalystRating } from '@/types';
import { getAnalystUpgrades } from '@/lib/fmp';
import { TrendingUp, Target, ArrowUpRight } from 'lucide-react';

export default function AnalystDiscovery() {
    const [upgrades, setUpgrades] = useState<AnalystRating[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const upg = await getAnalystUpgrades();
                setUpgrades(upg);
            } catch (e) {
                console.error("Failed to load discovery data", e);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

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
                        Market Discovery
                    </h2>
                    <p className="text-sm text-slate-500">Recent analyst upgrades from top-tier firms</p>
                </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] relative overflow-hidden group transition-all duration-500 hover:border-white/[0.1]">
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none group-hover:bg-emerald-500/8 transition-colors duration-700" />

                <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                            Recent Upgrades
                        </h3>
                        <span className="text-[11px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                            Major Movers
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {upgrades.length === 0 ? (
                            <p className="text-slate-500 text-sm col-span-full">No recent upgrades found.</p>
                        ) : (
                            upgrades.slice(0, 6).map((u, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/[0.04] hover:border-emerald-500/15 transition-all duration-300 group/card">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2.5">
                                            <span className="text-base font-bold text-white">{u.symbol}</span>
                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-white/[0.05] px-2 py-0.5 rounded truncate">{u.gradingCompany}</span>
                                        </div>
                                        <div className="text-sm mt-1.5 flex items-center gap-2">
                                            <span className="text-slate-500 line-through text-xs">{u.previousGrade}</span>
                                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover/card:opacity-100 transition-opacity" />
                                            <span className="text-emerald-400 font-bold text-xs">{u.newGrade}</span>
                                        </div>
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-600 bg-white/[0.03] px-2.5 py-1 rounded-lg flex-shrink-0 ml-3">
                                        {new Date(u.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
