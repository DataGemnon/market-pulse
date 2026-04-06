'use client';

import { AnalystRating } from '@/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalystFeedProps {
    ratings: AnalystRating[];
}

const AnalystFeed = ({ ratings }: AnalystFeedProps) => {
    if (ratings.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 text-sm">
                No recent analyst ratings found.
            </div>
        );
    }

    return (
        <div className="p-5">
            <h3 className="font-bold text-white mb-4 text-lg">Analyst Action</h3>
            <div className="space-y-3">
                {ratings.map((rating, idx) => {
                    const isUpgrade = rating.newGrade.toLowerCase().includes('buy') || rating.newGrade.toLowerCase().includes('outperform');
                    const isDowngrade = rating.newGrade.toLowerCase().includes('sell') || rating.newGrade.toLowerCase().includes('underperform');

                    const ratingDate = new Date(rating.date);
                    const today = new Date();
                    const isToday = ratingDate.getDate() === today.getDate() &&
                        ratingDate.getMonth() === today.getMonth() &&
                        ratingDate.getFullYear() === today.getFullYear();

                    return (
                        <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl transition-all border ${isToday
                            ? 'bg-cyan-500/[0.06] border-cyan-500/[0.15]'
                            : 'border-transparent hover:bg-white/[0.02] hover:border-white/[0.04]'
                            }`}>
                            <div className={`p-2 rounded-lg mt-0.5 ${isUpgrade ? 'bg-emerald-500/10 text-emerald-400' :
                                isDowngrade ? 'bg-red-500/10 text-red-400' : 'bg-white/[0.05] text-slate-400'
                                }`}>
                                {isUpgrade ? <TrendingUp size={14} /> :
                                    isDowngrade ? <TrendingDown size={14} /> : <Minus size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-white text-sm">{rating.symbol}</span>
                                        <span className="text-[11px] text-slate-500">&#x2022; {new Date(rating.date).toLocaleDateString()}</span>
                                    </div>
                                    {isToday && (
                                        <span className="text-[9px] font-bold bg-cyan-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Today
                                        </span>
                                    )}
                                </div>
                                <div className="text-sm font-medium text-slate-400 truncate">
                                    {rating.gradingCompany}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {rating.previousGrade ? `${rating.previousGrade} → ` : ''}
                                    <span className={`font-semibold ${isUpgrade ? 'text-emerald-400' :
                                        isDowngrade ? 'text-red-400' : 'text-slate-300'
                                        }`}>
                                        {rating.newGrade}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AnalystFeed;
