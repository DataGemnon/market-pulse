'use client';

import { MarketIndex } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketOverviewProps {
    indices: MarketIndex[];
}

const MarketOverview = ({ indices }: MarketOverviewProps) => {
    return (
        <div className="py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white">Market Overview</h2>
                    <p className="text-slate-500 text-sm">Real-time market data at a glance</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {indices.map((index) => {
                        const isPositive = index.changesPercentage >= 0;
                        return (
                            <div
                                key={index.symbol}
                                className="group relative bg-white/[0.03] backdrop-blur-sm p-6 rounded-2xl border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300"
                            >
                                {/* Subtle glow on hover */}
                                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${isPositive ? 'bg-emerald-500/[0.03]' : 'bg-red-500/[0.03]'}`} />

                                <div className="relative">
                                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">{index.name}</h3>
                                    <div className="flex items-baseline gap-2 mb-2">
                                        <span className="text-2xl font-bold text-white tabular-nums">
                                            {index.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${isPositive
                                        ? 'text-emerald-400 bg-emerald-500/10'
                                        : 'text-red-400 bg-red-500/10'
                                        }`}>
                                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        <span>{isPositive ? '+' : ''}{index.changesPercentage.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MarketOverview;
