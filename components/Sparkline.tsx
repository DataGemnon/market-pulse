'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { getSparklineAction } from '@/actions/charts';
import { HistoricalPrice } from '@/types';

interface SparklineProps {
    symbol: string;
    isPositive: boolean;
}

export default function Sparkline({ symbol, isPositive }: SparklineProps) {
    const [data, setData] = useState<HistoricalPrice[]>([]);

    useEffect(() => {
        let mounted = true;
        getSparklineAction(symbol).then(d => {
            if (mounted) setData(d);
        }).catch(() => {});
        return () => { mounted = false; };
    }, [symbol]);

    if (data.length < 2) {
        return <div className="w-[80px] h-[32px]" />;
    }

    const color = isPositive ? '#34d399' : '#f87171';
    const id = `spark-${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
        <div className="w-[80px] h-[32px]">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                    <defs>
                        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={color}
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill={`url(#${id})`}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
