'use client';

import { useState, useEffect } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { HistoricalPrice } from '@/types';
import { getChartDataAction } from '@/actions/charts';
import { Loader2 } from 'lucide-react';

type Range = '1D' | '1W' | '1M' | '3M' | '1Y';

interface StockChartProps {
    symbol: string;
    isPositive: boolean;
    currency?: string;
}

function getCurrencySymbol(currency?: string): string {
    const c = currency || 'USD';
    switch (c) {
        case 'EUR': return '€';
        case 'GBP': case 'GBp': return '£';
        case 'JPY': return '¥';
        case 'CHF': return 'CHF ';
        case 'HKD': return 'HK$';
        case 'USD': return '$';
        default: return `${c} `;
    }
}

const RANGES: Range[] = ['1D', '1W', '1M', '3M', '1Y'];

export default function StockChart({ symbol, isPositive, currency }: StockChartProps) {
    const [range, setRange] = useState<Range>('1M');
    const [data, setData] = useState<HistoricalPrice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        getChartDataAction(symbol, range).then(d => {
            if (mounted) {
                setData(d);
                setLoading(false);
            }
        }).catch(() => {
            if (mounted) setLoading(false);
        });
        return () => { mounted = false; };
    }, [symbol, range]);

    const color = isPositive ? '#34d399' : '#f87171';
    const gradientId = `grad-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
    const cs = getCurrencySymbol(currency);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (range === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (range === '1W') return d.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
        if (range === '1M') return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' });
    };

    const formatTooltipDate = (dateStr: string) => {
        const d = new Date(dateStr);
        if (range === '1D' || range === '1W') {
            return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Compute Y domain with padding
    let yDomain: [number, number] = [0, 100];
    if (data.length > 0) {
        const closes = data.map(d => d.close);
        const min = Math.min(...closes);
        const max = Math.max(...closes);
        const padding = (max - min) * 0.1 || max * 0.02;
        yDomain = [min - padding, max + padding];
    }

    return (
        <div className="p-5 pt-3">
            {/* Range Selector */}
            <div className="flex gap-1 mb-4">
                {RANGES.map(r => (
                    <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                            range === r
                                ? 'bg-white/[0.1] text-white border border-white/[0.15]'
                                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.05]'
                        }`}
                    >
                        {r}
                    </button>
                ))}
            </div>

            {/* Chart */}
            {loading ? (
                <div className="h-[200px] flex items-center justify-center">
                    <Loader2 className="animate-spin text-slate-500" size={24} />
                </div>
            ) : data.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
                    No chart data available
                </div>
            ) : (
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                minTickGap={40}
                            />
                            <YAxis
                                domain={yDomain}
                                orientation="right"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                                tickFormatter={v => `${cs}${v.toFixed(0)}`}
                                width={50}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                }}
                                labelFormatter={(label: any) => formatTooltipDate(String(label))}
                                labelStyle={{ color: '#94a3b8', fontSize: 11, marginBottom: 4 }}
                                formatter={(value: any) => [`${cs}${Number(value).toFixed(2)}`, 'Price']}
                                itemStyle={{ color: '#fff', fontWeight: 600, fontSize: 13 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="close"
                                stroke={color}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                                dot={false}
                                activeDot={{ r: 4, fill: color, stroke: '#0f172a', strokeWidth: 2 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
