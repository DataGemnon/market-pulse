'use client';

import { useState, useEffect } from 'react';
import type { SmartNewsResult } from '@/types';
import { getSmartNewsForStock } from '@/actions/ai-news';
import { Loader2, ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StockSmartFeedProps {
    watchlist: string[];
}

export default function StockSmartFeed({ watchlist }: StockSmartFeedProps) {
    if (watchlist.length === 0) {
        return (
            <div className="text-center p-8">
                <p className="text-slate-500">Add stocks to your watchlist to see AI summaries.</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
                <Sparkles size={18} className="text-cyan-400" />
                <span>Smart News Feed</span>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-gradient-to-r from-cyan-500/15 to-purple-500/15 text-cyan-400 rounded-full border border-cyan-500/20 uppercase tracking-wider">
                    AI Powered
                </span>
            </h3>

            <div className="grid gap-4">
                {watchlist.map(symbol => (
                    <StockNewsSummaryCard key={symbol} symbol={symbol} />
                ))}
            </div>
        </div>
    );
}

function StockNewsSummaryCard({ symbol }: { symbol: string }) {
    const [data, setData] = useState<SmartNewsResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        let mounted = true;
        const fetchData = async () => {
            setLoading(true);
            try {
                const result = await getSmartNewsForStock(symbol);
                if (mounted) setData(result);
            } catch (error) {
                console.error(error);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchData();
        return () => { mounted = false; };
    }, [symbol]);

    if (loading) {
        return (
            <div className="bg-white/[0.02] p-5 rounded-xl border border-white/[0.06] animate-pulse">
                <div className="flex justify-between mb-4">
                    <div className="h-6 w-20 bg-white/[0.06] rounded-lg"></div>
                    <div className="h-6 w-24 bg-white/[0.06] rounded-lg"></div>
                </div>
                <div className="h-4 w-full bg-white/[0.06] rounded mb-2"></div>
                <div className="h-4 w-2/3 bg-white/[0.06] rounded"></div>
            </div>
        );
    }

    if (!data) return null;

    const getSentimentStyle = (s: string) => {
        switch (s) {
            case 'POSITIVE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            case 'NEGATIVE': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-slate-400 bg-white/[0.05] border-white/[0.1]';
        }
    };

    const getSentimentIcon = (s: string) => {
        switch (s) {
            case 'POSITIVE': return <TrendingUp size={14} />;
            case 'NEGATIVE': return <TrendingDown size={14} />;
            default: return <Minus size={14} />;
        }
    };

    return (
        <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300 overflow-hidden group">
            <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white bg-white/[0.06] px-3 py-1.5 rounded-lg border border-white/[0.06]">
                            {symbol}
                        </span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${getSentimentStyle(data.sentiment)}`}>
                            {getSentimentIcon(data.sentiment)}
                            {data.sentiment}
                        </div>
                    </div>
                </div>

                <p className="text-sm text-slate-300 leading-relaxed mb-4">
                    {data.summary}
                </p>

                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-400 font-semibold transition-colors"
                >
                    {expanded ? "Hide Sources" : `View ${data.articles.length} Sources`}
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-white/[0.01] border-t border-white/[0.06]"
                    >
                        <div className="p-4 space-y-2">
                            {data.articles.map((article, idx) => (
                                <a
                                    key={idx}
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.03] border border-transparent hover:border-white/[0.06] transition-all group/link"
                                >
                                    <div className="w-14 h-10 bg-white/[0.05] rounded-lg flex-shrink-0 overflow-hidden">
                                        <img src={article.image} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-300 truncate group-hover/link:text-cyan-400 transition-colors">
                                            {article.title}
                                        </p>
                                        <div className="flex justify-between items-center mt-1">
                                            <span className="text-[11px] text-slate-500">{article.site}</span>
                                            <span className="text-[11px] text-slate-600">{new Date(article.publishedDate).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    <ExternalLink size={12} className="text-slate-600 group-hover/link:text-cyan-400 mt-1 flex-shrink-0" />
                                </a>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
