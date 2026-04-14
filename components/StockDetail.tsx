'use client';

import { StockQuote, HistoricalPrice } from '@/types';
import StockChart from './StockChart';
import { useState } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

interface StockDetailProps {
    quote: StockQuote;
    historicalData: HistoricalPrice[];
}

const timeRanges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

const StockDetail = ({ quote, historicalData }: StockDetailProps) => {
    const [activeRange, setActiveRange] = useState('1Y');
    const isPositive = quote.changesPercentage >= 0;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex gap-4">
                    <div className="bg-blue-50 text-blue-700 font-bold p-3 rounded-xl h-12 w-12 flex items-center justify-center text-lg">
                        {quote.symbol.slice(0, 2)}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-gray-900">{quote.symbol}</h2>
                            <span className="text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{quote.name}</span>
                        </div>
                        <p className="text-sm text-gray-500">{quote.name}</p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-3xl font-bold text-gray-900">${quote.price.toFixed(2)}</div>
                    <div className={clsx("flex items-center justify-end gap-1 text-sm font-medium", isPositive ? "text-green-600" : "text-red-500")}>
                        {isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                        <span>{isPositive ? '+' : ''}{quote.change.toFixed(2)} ({quote.changesPercentage.toFixed(2)}%) today</span>
                    </div>
                </div>
            </div>

            {/* Chart Controls */}
            <div className="flex gap-2 mb-4">
                {timeRanges.map((range) => (
                    <button
                        key={range}
                        onClick={() => setActiveRange(range)}
                        className={clsx(
                            "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                            activeRange === range
                                ? "bg-blue-600 text-white"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                        )}
                    >
                        {range}
                    </button>
                ))}
            </div>

            {/* Chart */}
            <div className="mb-8 border-b border-gray-100 pb-8">
                <StockChart symbol={quote.symbol} isPositive={isPositive} />
                <div className="mt-2 text-xs text-gray-400 text-left pl-2">${quote.dayLow}</div>
            </div>

            {/* Key Statistics (Placeholder for now, usually needs more data) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatItem label="Market Cap" value={(quote.marketCap / 1e9).toFixed(2) + 'B'} />
                <StatItem label="P/E Ratio" value={quote.pe.toFixed(2)} />
                <StatItem label="Volume" value={(quote.volume / 1e6).toFixed(1) + 'M'} />
                <StatItem label="Avg Vol (3m)" value={(quote.avgVolume / 1e6).toFixed(1) + 'M'} />
                <StatItem label="EPS" value={quote.eps.toFixed(2)} />
                <StatItem label="Year High" value={quote.yearHigh.toFixed(2)} />
                <StatItem label="Year Low" value={quote.yearLow.toFixed(2)} />
                <StatItem label="Next Earnings" value={new Date(quote.earningsAnnouncement).toLocaleDateString()} />
            </div>
        </div>
    );
};

const StatItem = ({ label, value }: { label: string, value: string | number }) => (
    <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="font-semibold text-gray-900">{value}</div>
    </div>
);

export default StockDetail;
