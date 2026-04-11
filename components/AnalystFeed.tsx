'use client';

import { AnalystConsensus } from '@/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalystFeedProps {
    consensus: AnalystConsensus[];
}

const AnalystFeed = ({ consensus }: AnalystFeedProps) => {
    if (consensus.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 text-sm">
                No analyst data found. Add stocks to your watchlist.
            </div>
        );
    }

    return (
        <div className="p-5">
            <h3 className="font-bold text-white mb-4 text-lg">Analyst Consensus</h3>
            <div className="space-y-3">
                {consensus.map((c, idx) => {
                    const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell;
                    if (total === 0) return null;

                    const bulls = c.strongBuy + c.buy;
                    const bears = c.sell + c.strongSell;
                    const bullPercent = Math.round((bulls / total) * 100);

                    const sentiment = bullPercent >= 70 ? 'bullish' : bullPercent <= 30 ? 'bearish' : 'mixed';

                    return (
                        <div key={idx} className="p-3 rounded-xl border border-transparent hover:bg-white/[0.02] hover:border-white/[0.04] transition-all">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`p-1.5 rounded-lg ${
                                        sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-400' :
                                        sentiment === 'bearish' ? 'bg-red-500/10 text-red-400' :
                                        'bg-yellow-500/10 text-yellow-400'
                                    }`}>
                                        {sentiment === 'bullish' ? <TrendingUp size={14} /> :
                                         sentiment === 'bearish' ? <TrendingDown size={14} /> :
                                         <Minus size={14} />}
                                    </div>
                                    <span className="font-bold text-white text-sm">{c.symbol}</span>
                                </div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                    sentiment === 'bullish' ? 'text-emerald-400 bg-emerald-500/10' :
                                    sentiment === 'bearish' ? 'text-red-400 bg-red-500/10' :
                                    'text-yellow-400 bg-yellow-500/10'
                                }`}>
                                    {bullPercent}% Buy
                                </span>
                            </div>

                            {/* Mini consensus bar */}
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-white/[0.03]">
                                {c.strongBuy > 0 && <div className="bg-emerald-400" style={{ width: `${(c.strongBuy / total) * 100}%` }} />}
                                {c.buy > 0 && <div className="bg-emerald-500/60" style={{ width: `${(c.buy / total) * 100}%` }} />}
                                {c.hold > 0 && <div className="bg-yellow-500/50" style={{ width: `${(c.hold / total) * 100}%` }} />}
                                {c.sell > 0 && <div className="bg-red-500/60" style={{ width: `${(c.sell / total) * 100}%` }} />}
                                {c.strongSell > 0 && <div className="bg-red-400" style={{ width: `${(c.strongSell / total) * 100}%` }} />}
                            </div>

                            <div className="flex justify-between mt-1.5 text-[10px] text-slate-500">
                                <span>{bulls} Buy · {c.hold} Hold · {bears} Sell</span>
                                <span>{total} analysts</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AnalystFeed;
