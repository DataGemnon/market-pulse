'use client';

import { WatchlistItem } from '@/types';
import { Plus, TrendingUp, TrendingDown, Trash2, X, Check, ChevronDown } from 'lucide-react';
import { Fragment, useState } from 'react';
import Sparkline from '@/components/Sparkline';
import StockChart from '@/components/StockChart';

function getCurrencySymbol(currency?: string): string {
    const c = currency || 'USD';
    switch (c) {
        case 'EUR': return '€';
        case 'GBP': return '£';
        case 'GBp': return '£';  // pence — displayed as-is, Yahoo returns pence for LSE
        case 'JPY': return '¥';
        case 'CHF': return 'CHF ';
        case 'HKD': return 'HK$';
        case 'SEK': case 'DKK': case 'NOK': return `${c} `;
        case 'USD': return '$';
        default: return `${c} `;
    }
}

interface WatchlistProps {
    items: WatchlistItem[];
    onAddSymbol: (symbol: string) => void;
    onRemoveSymbol: (symbol: string) => void;
}

const Watchlist = ({ items, onAddSymbol, onRemoveSymbol }: WatchlistProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newSymbol, setNewSymbol] = useState('');
    const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSymbol.trim()) {
            onAddSymbol(newSymbol.trim());
            setNewSymbol('');
            setIsAdding(false);
        }
    };

    return (
        <div>
            <div className="p-5 flex justify-between items-center border-b border-white/[0.06]">
                <h3 className="font-bold text-white text-lg">My Watchlist</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-1.5 text-cyan-400 text-sm font-semibold hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-cyan-500/10"
                >
                    <Plus size={16} /> Add
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAddSubmit} className="p-4 bg-white/[0.02] border-b border-white/[0.06] flex gap-2">
                    <input
                        type="text"
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value)}
                        placeholder="e.g. MSFT, MC.PA, SAP.DE"
                        className="flex-1 px-3 py-2 text-sm bg-white/[0.05] border border-white/[0.1] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 text-white placeholder-slate-500 uppercase"
                        autoFocus
                    />
                    <button
                        type="submit"
                        className="p-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </form>
            )}

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/[0.06]">
                            <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Asset</th>
                            <th className="px-5 py-3 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">5D</th>
                            <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                            <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Change</th>
                            <th className="px-5 py-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const isPositive = item.changesPercentage >= 0;
                            const isExpanded = expandedSymbol === item.symbol;
                            return (
                                <Fragment key={item.symbol}>
                                    <tr
                                        className="group border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors cursor-pointer"
                                        onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}
                                    >
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-white/[0.06] flex items-center justify-center font-bold text-xs text-cyan-400">
                                                    {item.symbol.slice(0, 2)}
                                                </div>
                                                <div className="ml-3">
                                                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                                                        {item.symbol}
                                                        <ChevronDown size={12} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[100px]">{item.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap hidden sm:table-cell">
                                            <div className="flex justify-center">
                                                <Sparkline symbol={item.symbol} isPositive={isPositive} />
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-semibold text-white tabular-nums">
                                                {getCurrencySymbol(item.currency)}{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-right">
                                            <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${isPositive
                                                ? 'text-emerald-400 bg-emerald-500/10'
                                                : 'text-red-400 bg-red-500/10'
                                                }`}>
                                                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {isPositive ? '+' : ''}{item.changesPercentage.toFixed(2)}%
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onRemoveSymbol(item.symbol); }}
                                                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr className="border-b border-white/[0.03]">
                                            <td colSpan={5} className="bg-white/[0.01]">
                                                <StockChart symbol={item.symbol} isPositive={isPositive} currency={item.currency} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Watchlist;
