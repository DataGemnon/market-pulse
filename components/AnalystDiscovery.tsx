'use client';

import { useEffect, useState } from 'react';
import { AnalystConsensus } from '@/types';
import { getAnalystConsensusAction } from '@/actions/analyst';
import { Target, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

interface ConsensusWithShift extends AnalystConsensus {
    buyShift: number;
    totalAnalysts: number;
    bullPercent: number;
}

export default function AnalystDiscovery() {
    const [consensus, setConsensus] = useState<ConsensusWithShift[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const consensusData = await getAnalystConsensusAction();
                setConsensus(consensusData);
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
                    <p className="text-sm text-slate-500">Analyst consensus & rating changes</p>
                </div>
            </div>

            {/* Analyst Consensus Grid */}
            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] relative overflow-hidden group transition-all duration-500 hover:border-white/[0.1]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />

                <div className="p-6 sm:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-cyan-400" />
                            Analyst Consensus
                        </h3>
                        <span className="text-[11px] font-bold px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                            Wall Street View
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {consensus.length === 0 ? (
                            <p className="text-slate-500 text-sm col-span-full">No consensus data available.</p>
                        ) : (
                            consensus.map((c, i) => (
                                <div key={i} className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/[0.04] hover:border-white/[0.08] transition-all duration-300">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-base font-bold text-white">{c.symbol}</span>
                                        <div className="flex items-center gap-1">
                                            {c.buyShift > 0 && (
                                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                    <ArrowUpRight size={10} />+{c.buyShift}
                                                </span>
                                            )}
                                            {c.buyShift < 0 && (
                                                <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                    <ArrowDownRight size={10} />{c.buyShift}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Consensus bar */}
                                    <div className="flex h-2.5 rounded-full overflow-hidden mb-2.5 bg-white/[0.03]">
                                        {c.strongBuy > 0 && (
                                            <div className="bg-emerald-400" style={{ width: `${(c.strongBuy / c.totalAnalysts) * 100}%` }} />
                                        )}
                                        {c.buy > 0 && (
                                            <div className="bg-emerald-500/60" style={{ width: `${(c.buy / c.totalAnalysts) * 100}%` }} />
                                        )}
                                        {c.hold > 0 && (
                                            <div className="bg-yellow-500/50" style={{ width: `${(c.hold / c.totalAnalysts) * 100}%` }} />
                                        )}
                                        {c.sell > 0 && (
                                            <div className="bg-red-500/60" style={{ width: `${(c.sell / c.totalAnalysts) * 100}%` }} />
                                        )}
                                        {c.strongSell > 0 && (
                                            <div className="bg-red-400" style={{ width: `${(c.strongSell / c.totalAnalysts) * 100}%` }} />
                                        )}
                                    </div>

                                    {/* Labels */}
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-emerald-400 font-bold">
                                            {c.bullPercent}% Buy
                                        </span>
                                        <span className="text-slate-500">
                                            {c.totalAnalysts} analysts
                                        </span>
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
