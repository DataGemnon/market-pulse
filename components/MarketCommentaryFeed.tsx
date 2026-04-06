'use client';

import { useEffect, useState } from 'react';
import { MarketCommentary } from '@/types';
import { getMarketCommentaryAction } from '@/actions/market-commentary';
import { MessageSquareQuote, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

export default function MarketCommentaryFeed() {
    const [commentary, setCommentary] = useState<MarketCommentary[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'bullish' | 'bearish'>('all');

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getMarketCommentaryAction();
                setCommentary(data);
            } catch (e) {
                console.error('Failed to load market commentary', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const filtered = commentary.filter(c => {
        if (filter === 'bullish') return c.sentiment === 'BULLISH';
        if (filter === 'bearish') return c.sentiment === 'BEARISH';
        return true;
    });

    if (loading) {
        return (
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-8 flex flex-col items-center justify-center min-h-[200px]">
                <Loader2 className="w-7 h-7 text-cyan-400 animate-spin mb-3" />
                <p className="text-slate-400 font-medium text-sm">Scanning for notable opinions...</p>
                <p className="text-[11px] text-slate-600 mt-1">Analyzing news with AI</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl text-white shadow-lg shadow-cyan-500/15">
                    <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Market Voices</h2>
                    <p className="text-sm text-slate-500">What prominent figures are saying</p>
                </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden">
                {/* Filter tabs */}
                <div className="p-4 border-b border-white/[0.06] flex gap-2">
                    {(['all', 'bullish', 'bearish'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider transition-all ${filter === f
                                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                                : 'text-slate-500 hover:text-slate-300 border border-transparent'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                        No notable commentary found in recent news.
                    </div>
                ) : (
                    <div className="p-3 space-y-3">
                        {filtered.map((item, idx) => {
                            const sentimentStyle =
                                item.sentiment === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                    item.sentiment === 'BEARISH' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                        'text-slate-400 bg-white/[0.05] border-white/[0.1]';

                            const SentimentIcon =
                                item.sentiment === 'BULLISH' ? TrendingUp :
                                    item.sentiment === 'BEARISH' ? TrendingDown : Minus;

                            return (
                                <div
                                    key={idx}
                                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-all"
                                >
                                    {/* Quote mark */}
                                    <div className="text-cyan-500/15 text-4xl font-serif leading-none mb-1">&ldquo;</div>

                                    <p className="text-sm text-slate-300 leading-relaxed mb-3 -mt-3 pl-1">
                                        {item.opinion}
                                    </p>

                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            {/* Person avatar */}
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center text-[11px] font-bold text-cyan-400">
                                                {item.personName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white">{item.personName}</div>
                                                <div className="text-[10px] text-slate-500">{item.personTitle}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Subject chip */}
                                            <span className="text-[10px] font-bold text-white bg-white/[0.06] px-2 py-0.5 rounded-md border border-white/[0.06]">
                                                {item.subject}
                                            </span>
                                            {/* Sentiment badge */}
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${sentimentStyle}`}>
                                                <SentimentIcon size={10} />
                                                {item.sentiment}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-600">
                                        <span>{item.source}</span>
                                        <span>&#x2022;</span>
                                        <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="p-3 text-center text-[11px] text-slate-600 border-t border-white/[0.04]">
                    Powered by Claude AI
                </div>
            </div>
        </div>
    );
}
