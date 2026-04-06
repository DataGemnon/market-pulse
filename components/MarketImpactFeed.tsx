'use client';

import { useEffect, useState } from 'react';

import { getMarketImpactAction } from '@/actions/market-impact';
import { MarketImpactAnalysis } from '@/lib/claude';
import { Loader2, TrendingUp, TrendingDown, Minus, Globe, AlertTriangle, Building2, Activity } from 'lucide-react';

export default function MarketImpactFeed() {
    const [analysis, setAnalysis] = useState<MarketImpactAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const result = await getMarketImpactAction();
                if (result) {
                    setAnalysis(result);
                } else {
                    setError('Unable to analyze market impact.');
                }
            } catch (err) {
                console.error('Failed to fetch market impact data:', err);
                setError('Unable to load market impact analysis.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-8 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-4" />
                <p className="text-slate-400 font-medium">Analyzing market drivers...</p>
                <p className="text-xs text-slate-600 mt-2">Scanning Global News & Economic Data</p>
            </div>
        );
    }

    if (error || !analysis) {
        return (
            <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-8 text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-red-400" />
                <p className="text-red-400">{error || 'No analysis available.'}</p>
            </div>
        );
    }

    const sentimentStyle =
        analysis.market_sentiment === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
            analysis.market_sentiment === 'BEARISH' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                'text-slate-400 bg-white/[0.05] border-white/[0.1]';

    const sentimentIcon =
        analysis.market_sentiment === 'BULLISH' ? <TrendingUp className="w-5 h-5" /> :
            analysis.market_sentiment === 'BEARISH' ? <TrendingDown className="w-5 h-5" /> :
                <Minus className="w-5 h-5" />;

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.1]">
            <div className="p-6 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        AI Market Briefing
                    </h2>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-sm ${sentimentStyle}`}>
                        {sentimentIcon}
                        <span>{analysis.market_sentiment}</span>
                    </div>
                </div>
                <p className="text-slate-300 leading-relaxed text-base">
                    {analysis.summary}
                </p>
            </div>

            <div className="divide-y divide-white/[0.04]">
                {analysis.key_drivers.map((driver, idx) => (
                    <div key={idx} className="p-5 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="mt-0.5">
                                {driver.category === 'GEOPOLITICS' && <Globe className="w-5 h-5 text-purple-400" />}
                                {driver.category === 'ECONOMY' && <TrendingUp className="w-5 h-5 text-cyan-400" />}
                                {driver.category === 'POLICY' && <Building2 className="w-5 h-5 text-orange-400" />}
                                {driver.category === 'MARKET' && <Activity className="w-5 h-5 text-slate-400" />}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <h3 className="font-semibold text-white">{driver.title}</h3>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${driver.impact_level === 'HIGH' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                        driver.impact_level === 'MEDIUM' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                            'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                        }`}>
                                        {driver.impact_level}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400">{driver.description}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 text-center text-[11px] text-slate-600 border-t border-white/[0.04]">
                Powered by Claude AI & Financial Modeling Prep
            </div>
        </div>
    );
}
