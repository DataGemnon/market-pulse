'use client';

import { Position, WatchlistItem } from '@/types';
import { Plus, TrendingUp, TrendingDown, Trash2, X, Check, ChevronDown, Briefcase, Edit3 } from 'lucide-react';
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

function formatCurrency(value: number, currency?: string): string {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface WatchlistProps {
    items: WatchlistItem[];
    onAddSymbol: (symbol: string) => void;
    onRemoveSymbol: (symbol: string) => void;
    onSetPosition: (symbol: string, position: Position | null) => void;
}

const Watchlist = ({ items, onAddSymbol, onRemoveSymbol, onSetPosition }: WatchlistProps) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newSymbol, setNewSymbol] = useState('');
    const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
    const [editingPosition, setEditingPosition] = useState<WatchlistItem | null>(null);

    const handleAddSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSymbol.trim()) {
            onAddSymbol(newSymbol.trim());
            setNewSymbol('');
            setIsAdding(false);
        }
    };

    // Portfolio summary — group by currency since we don't do FX conversion
    const positionsByCurrency = items
        .filter(i => i.position && i.position.quantity > 0)
        .reduce<Record<string, { value: number; cost: number }>>((acc, item) => {
            const cur = item.currency || 'USD';
            const value = item.price * item.position!.quantity;
            const cost = item.position!.buyPrice * item.position!.quantity;
            if (!acc[cur]) acc[cur] = { value: 0, cost: 0 };
            acc[cur].value += value;
            acc[cur].cost += cost;
            return acc;
        }, {});

    const hasPositions = Object.keys(positionsByCurrency).length > 0;

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

            {/* Portfolio Summary — only shown when at least one position is set */}
            {hasPositions && (
                <div className="px-5 py-4 bg-gradient-to-r from-cyan-500/[0.04] to-purple-500/[0.04] border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-3">
                        <Briefcase size={14} className="text-cyan-400" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Portfolio</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(positionsByCurrency).map(([currency, totals]) => {
                            const pnl = totals.value - totals.cost;
                            const pnlPct = totals.cost > 0 ? (pnl / totals.cost) * 100 : 0;
                            const isPositive = pnl >= 0;
                            return (
                                <div key={currency} className="bg-white/[0.03] rounded-lg p-3 border border-white/[0.06]">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{currency}</span>
                                        <span className="text-[10px] text-slate-500">Cost: {formatCurrency(totals.cost, currency)}</span>
                                    </div>
                                    <div className="text-base font-bold text-white tabular-nums">
                                        {formatCurrency(totals.value, currency)}
                                    </div>
                                    <div className={`text-xs font-semibold tabular-nums mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isPositive ? '+' : ''}{formatCurrency(pnl, currency)} ({isPositive ? '+' : ''}{pnlPct.toFixed(2)}%)
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

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
                            <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">P&amp;L</th>
                            <th className="px-5 py-3 w-12"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => {
                            const isPositive = item.changesPercentage >= 0;
                            const isExpanded = expandedSymbol === item.symbol;
                            const hasPosition = item.position && item.position.quantity > 0;
                            const positionValue = hasPosition ? item.price * item.position!.quantity : 0;
                            const positionCost = hasPosition ? item.position!.buyPrice * item.position!.quantity : 0;
                            const positionPnL = positionValue - positionCost;
                            const positionPnLPct = positionCost > 0 ? (positionPnL / positionCost) * 100 : 0;
                            const positionPositive = positionPnL >= 0;

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
                                                {formatCurrency(item.price, item.currency)}
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
                                        <td className="px-5 py-4 whitespace-nowrap text-right hidden md:table-cell">
                                            {hasPosition ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingPosition(item); }}
                                                    className="text-right group/pnl"
                                                    title="Edit position"
                                                >
                                                    <div className={`text-sm font-semibold tabular-nums ${positionPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {positionPositive ? '+' : ''}{formatCurrency(positionPnL, item.currency)}
                                                    </div>
                                                    <div className={`text-[10px] tabular-nums ${positionPositive ? 'text-emerald-500/70' : 'text-red-500/70'}`}>
                                                        {positionPositive ? '+' : ''}{positionPnLPct.toFixed(2)}% · {item.position!.quantity} sh
                                                    </div>
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingPosition(item); }}
                                                    className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Add a position"
                                                >
                                                    <Plus size={11} /> Add position
                                                </button>
                                            )}
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
                                            <td colSpan={6} className="bg-white/[0.01]">
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

            {editingPosition && (
                <PositionModal
                    item={editingPosition}
                    onClose={() => setEditingPosition(null)}
                    onSave={(position) => {
                        onSetPosition(editingPosition.symbol, position);
                        setEditingPosition(null);
                    }}
                />
            )}
        </div>
    );
};

interface PositionModalProps {
    item: WatchlistItem;
    onClose: () => void;
    onSave: (position: Position | null) => void;
}

function PositionModal({ item, onClose, onSave }: PositionModalProps) {
    const [buyPrice, setBuyPrice] = useState<string>(
        item.position?.buyPrice?.toString() || ''
    );
    const [quantity, setQuantity] = useState<string>(
        item.position?.quantity?.toString() || ''
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const bp = parseFloat(buyPrice);
        const q = parseFloat(quantity);
        if (isNaN(bp) || isNaN(q) || bp <= 0 || q <= 0) return;
        onSave({ buyPrice: bp, quantity: q });
    };

    const handleClear = () => {
        onSave(null);
    };

    const cs = getCurrencySymbol(item.currency);
    const hasExisting = !!item.position;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Edit3 size={16} className="text-cyan-400" />
                            {hasExisting ? 'Edit Position' : 'Add Position'}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{item.symbol} · {item.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-slate-300 hover:bg-white/[0.05] rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="bg-white/[0.03] rounded-xl p-3 mb-5 border border-white/[0.06]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Price</div>
                    <div className="text-lg font-bold text-white tabular-nums">{formatCurrency(item.price, item.currency)}</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Buy Price ({cs.trim() || '$'})</label>
                        <input
                            type="number"
                            step="any"
                            value={buyPrice}
                            onChange={(e) => setBuyPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 tabular-nums"
                            autoFocus
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Quantity (shares)</label>
                        <input
                            type="number"
                            step="any"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="0"
                            className="w-full px-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 tabular-nums"
                            required
                        />
                    </div>

                    {/* Live preview */}
                    {buyPrice && quantity && !isNaN(parseFloat(buyPrice)) && !isNaN(parseFloat(quantity)) && parseFloat(buyPrice) > 0 && parseFloat(quantity) > 0 && (() => {
                        const bp = parseFloat(buyPrice);
                        const q = parseFloat(quantity);
                        const cost = bp * q;
                        const value = item.price * q;
                        const pnl = value - cost;
                        const pnlPct = (pnl / cost) * 100;
                        const isPos = pnl >= 0;
                        return (
                            <div className="bg-white/[0.02] rounded-xl p-3 border border-white/[0.06] space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Cost basis</span>
                                    <span className="text-slate-300 tabular-nums">{formatCurrency(cost, item.currency)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Current value</span>
                                    <span className="text-white font-semibold tabular-nums">{formatCurrency(value, item.currency)}</span>
                                </div>
                                <div className="flex justify-between text-xs pt-1 border-t border-white/[0.06]">
                                    <span className="text-slate-500">Unrealized P&amp;L</span>
                                    <span className={`font-bold tabular-nums ${isPos ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {isPos ? '+' : ''}{formatCurrency(pnl, item.currency)} ({isPos ? '+' : ''}{pnlPct.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="flex gap-2 pt-2">
                        {hasExisting && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-4 py-2.5 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                            >
                                Remove
                            </button>
                        )}
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2.5 text-sm font-bold bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
                        >
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Watchlist;
