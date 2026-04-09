'use client';

import { useEffect, useState } from 'react';
import { MarketIndex } from '@/types';
import { getInternationalIndicesAction } from '@/actions/international-indices';
import { Globe, TrendingUp, TrendingDown } from 'lucide-react';

const INDEX_CONFIG: Record<string, { label: string; flag: string; image: string }> = {
    '^FCHI': {
        label: 'CAC 40',
        flag: '🇫🇷',
        image: 'https://images.unsplash.com/photo-1511739001486-6bfe10ce65f4?w=500&h=300&fit=crop&q=80',
    },
    '^GDAXI': {
        label: 'DAX',
        flag: '🇩🇪',
        image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=500&h=300&fit=crop&q=80',
    },
    '^FTSE': {
        label: 'FTSE 100',
        flag: '🇬🇧',
        image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=500&h=300&fit=crop&q=80',
    },
    '^N225': {
        label: 'Nikkei 225',
        flag: '🇯🇵',
        image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=500&h=300&fit=crop&q=80',
    },
    '^HSI': {
        label: 'Hang Seng',
        flag: '🇭🇰',
        image: 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?w=500&h=300&fit=crop&q=80',
    },
};

export default function InternationalIndices() {
    const [indices, setIndices] = useState<MarketIndex[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getInternationalIndicesAction();
                setIndices(data);
            } catch (e) {
                console.error('Failed to load international indices', e);
            } finally {
                setLoading(false);
            }
        };
        load();

        const interval = setInterval(load, 60_000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 w-56 bg-white/[0.06] rounded-lg mb-6" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="h-28 bg-white/[0.03] rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (indices.length === 0) return null;

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/15">
                    <Globe className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Global Markets</h2>
                    <p className="text-xs text-slate-500">Europe & Asia-Pacific indices</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {indices.map((idx) => {
                    const config = INDEX_CONFIG[idx.symbol];
                    if (!config) return null;

                    const isPositive = idx.changesPercentage >= 0;

                    return (
                        <div
                            key={idx.symbol}
                            className="group relative h-32 rounded-xl overflow-hidden cursor-default transition-all duration-300 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/20"
                        >
                            {/* Background image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${config.image})` }}
                            />

                            {/* Dark overlay */}
                            <div className={`absolute inset-0 ${isPositive
                                ? 'bg-gradient-to-t from-black/90 via-black/65 to-emerald-900/20'
                                : 'bg-gradient-to-t from-black/90 via-black/65 to-red-900/20'
                                }`}
                            />

                            {/* Flag */}
                            <div className="absolute top-2.5 left-2.5">
                                <span className="text-sm">{config.flag}</span>
                            </div>

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-3">
                                <div className="text-xs font-bold text-white/80 mb-1">{config.label}</div>
                                <div className="text-sm font-bold text-white tabular-nums mb-1">
                                    {idx.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </div>
                                <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold backdrop-blur-sm ${isPositive
                                    ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/25'
                                    : 'text-red-300 bg-red-500/20 border border-red-500/25'
                                    }`}>
                                    {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                    <span className="tabular-nums">
                                        {isPositive ? '+' : ''}{idx.changesPercentage.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
