'use client';

import { useEffect, useState } from 'react';
import { SectorPerformance } from '@/types';
import { getSectorPerformance } from '@/lib/fmp';
import { LayoutGrid, TrendingUp, TrendingDown } from 'lucide-react';

// Map each FMP sector name to a relevant Unsplash image
const SECTOR_IMAGES: Record<string, string> = {
    'Information Technology': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&h=300&fit=crop&q=80',
    'Health Care': 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=500&h=300&fit=crop&q=80',
    'Financials': 'https://images.unsplash.com/photo-1560472355-536de3962603?w=500&h=300&fit=crop&q=80',
    'Consumer Cyclical': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=300&fit=crop&q=80',
    'Communication Services': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&h=300&fit=crop&q=80',
    'Industrials': 'https://images.unsplash.com/photo-1513828583688-c52646db42da?w=500&h=300&fit=crop&q=80',
    'Consumer Defensive': 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500&h=300&fit=crop&q=80',
    'Energy': 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=500&h=300&fit=crop&q=80',
    'Materials': 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500&h=300&fit=crop&q=80',
    'Real Estate': 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&h=300&fit=crop&q=80',
    'Utilities': 'https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=500&h=300&fit=crop&q=80',
};

// Fallback image for unknown sectors
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&h=300&fit=crop&q=80';

export default function SectorHeatmap() {
    const [sectors, setSectors] = useState<SectorPerformance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getSectorPerformance();
                setSectors(data);
            } catch (e) {
                console.error('Failed to load sector data', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 w-48 bg-white/[0.06] rounded-lg mb-6" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-36 bg-white/[0.03] rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (sectors.length === 0) return null;

    // Sort from best to worst performer
    const sorted = [...sectors].sort((a, b) => {
        const aVal = parseFloat(a.changesPercentage);
        const bVal = parseFloat(b.changesPercentage);
        return bVal - aVal;
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl text-white shadow-lg shadow-orange-500/15">
                    <LayoutGrid className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">Sector Heatmap</h2>
                    <p className="text-sm text-slate-500">Ranked from best to worst performer today</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {sorted.map((sector, index) => {
                    const pct = parseFloat(sector.changesPercentage);
                    const isPositive = pct >= 0;
                    const imageUrl = SECTOR_IMAGES[sector.sector] || FALLBACK_IMAGE;

                    return (
                        <div
                            key={sector.sector}
                            className="group relative h-40 rounded-2xl overflow-hidden cursor-default transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/20"
                        >
                            {/* Background image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${imageUrl})` }}
                            />

                            {/* Dark overlay with color tint */}
                            <div className={`absolute inset-0 ${isPositive
                                ? 'bg-gradient-to-t from-black/85 via-black/60 to-emerald-900/30'
                                : 'bg-gradient-to-t from-black/85 via-black/60 to-red-900/30'
                                }`}
                            />

                            {/* Rank badge */}
                            <div className="absolute top-3 left-3">
                                <span className="text-[10px] font-bold text-white/40 bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-md">
                                    #{index + 1}
                                </span>
                            </div>

                            {/* Content */}
                            <div className="absolute bottom-0 left-0 right-0 p-4">
                                <div className="text-sm font-bold text-white mb-1.5 drop-shadow-lg">
                                    {sector.sector}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-bold backdrop-blur-sm ${isPositive
                                        ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30'
                                        : 'text-red-300 bg-red-500/20 border border-red-500/30'
                                        }`}>
                                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                        <span className="tabular-nums">
                                            {isPositive ? '+' : ''}{pct.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
