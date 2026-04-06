'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';
import { HistoricalPrice } from '@/types';

interface StockChartProps {
    data: HistoricalPrice[];
    color?: string;
}

const StockChart = ({ data, color = '#2563eb' }: StockChartProps) => {
    return (
        <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.1} />
                            <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis
                        dataKey="date"
                        hide={true}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        orientation="right"
                        tick={{ fontSize: 12, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value.toFixed(0)}`}
                        width={40}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#111827', fontWeight: 600 }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value: number | undefined) => [`$${(value ?? 0).toFixed(2)}`, 'Price'] as const}
                    />
                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={color}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default StockChart;
