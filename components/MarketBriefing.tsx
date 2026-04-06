'use client';

import { useState } from 'react';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { NewsArticle } from '@/types';

interface MarketBriefingProps {
    news: NewsArticle[];
}

const MarketBriefing = ({ news }: MarketBriefingProps) => {
    const [summary, setSummary] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const generateBriefing = async () => {
        if (news.length === 0) return;

        setLoading(true);
        try {
            const res = await fetch('/api/ai-summary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ news: news.slice(0, 50) })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.summary) {
                    setSummary(data.summary);
                    setLastUpdated(new Date());
                }
            }
        } catch (error) {
            console.error('Failed to generate briefing:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative bg-gradient-to-br from-purple-500/[0.08] to-cyan-500/[0.05] rounded-2xl border border-purple-500/[0.12] overflow-hidden">
            {/* Subtle glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />

            <div className="relative p-6">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl text-white shadow-lg shadow-purple-500/20">
                            <Sparkles size={18} />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg">Market Briefing</h2>
                            <p className="text-[11px] text-purple-400 font-semibold tracking-wider uppercase">AI-Powered</p>
                        </div>
                    </div>

                    {!loading && summary.length === 0 && (
                        <button
                            onClick={generateBriefing}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/15 text-purple-300 text-sm font-bold rounded-xl border border-purple-500/20 hover:bg-purple-500/25 hover:text-purple-200 transition-all"
                        >
                            <Sparkles size={14} />
                            Generate
                        </button>
                    )}

                    {loading && (
                        <div className="flex items-center gap-2 text-purple-400 text-sm font-medium animate-pulse">
                            <Loader2 size={16} className="animate-spin" />
                            Analyzing...
                        </div>
                    )}
                </div>

                {summary.length > 0 && (
                    <div className="space-y-3">
                        <ul className="space-y-2">
                            {summary.map((point, idx) => (
                                <li key={idx} className="flex gap-3 text-slate-300 text-sm leading-relaxed bg-white/[0.03] p-3 rounded-lg border border-white/[0.04]">
                                    <span className="text-purple-400 font-bold mt-0.5">&#x2022;</span>
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/[0.06]">
                            <span className="text-[11px] text-slate-600">
                                Generated at {lastUpdated?.toLocaleTimeString()}
                            </span>
                            <button
                                onClick={generateBriefing}
                                className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition-colors"
                            >
                                <RefreshCw size={11} />
                                Refresh
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketBriefing;
