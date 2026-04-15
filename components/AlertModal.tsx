'use client';

import { PriceAlert, WatchlistItem } from '@/types';
import { Bell, X, Trash2, ArrowUp, ArrowDown, BellOff, BellRing } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getNotificationPermission, requestNotificationPermission } from '@/lib/notifications';

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

interface AlertModalProps {
    item: WatchlistItem;
    alerts: PriceAlert[];
    onClose: () => void;
    onAdd: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'triggered'>) => void;
    onRemove: (alertId: string) => void;
}

export default function AlertModal({ item, alerts, onClose, onAdd, onRemove }: AlertModalProps) {
    const [type, setType] = useState<'above' | 'below'>('above');
    const [price, setPrice] = useState<string>('');
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');

    useEffect(() => {
        setPermission(getNotificationPermission());
    }, []);

    const cs = getCurrencySymbol(item.currency);

    const handleAddClick = async () => {
        const p = parseFloat(price);
        if (isNaN(p) || p <= 0) return;

        // Request permission lazily on first alert if needed
        if (permission === 'default') {
            const result = await requestNotificationPermission();
            setPermission(result);
        }

        onAdd({ symbol: item.symbol, type, price: p });
        setPrice('');
    };

    const symbolAlerts = alerts.filter(a => a.symbol === item.symbol);
    const activeAlerts = symbolAlerts.filter(a => !a.triggered);
    const triggeredAlerts = symbolAlerts.filter(a => a.triggered);

    const formatPrice = (p: number) => `${cs}${p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
                            <Bell size={16} className="text-cyan-400" />
                            Price Alerts
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

                {/* Current price */}
                <div className="bg-white/[0.03] rounded-xl p-3 mb-4 border border-white/[0.06]">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Current Price</div>
                    <div className="text-lg font-bold text-white tabular-nums">{formatPrice(item.price)}</div>
                </div>

                {/* Permission banner */}
                {permission === 'denied' && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                        <BellOff size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-red-300">
                            Browser notifications are blocked. Alerts will still trigger in the dashboard, but you won't get system notifications.
                        </div>
                    </div>
                )}
                {permission === 'unsupported' && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex items-start gap-2">
                        <BellOff size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-300">
                            Your browser doesn't support notifications. Alerts will still appear in the dashboard.
                        </div>
                    </div>
                )}

                {/* Existing alerts */}
                {symbolAlerts.length > 0 && (
                    <div className="mb-4 space-y-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</div>
                        {activeAlerts.length === 0 && (
                            <div className="text-xs text-slate-600 italic">No active alerts</div>
                        )}
                        {activeAlerts.map(alert => (
                            <div key={alert.id} className="flex items-center gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.06]">
                                {alert.type === 'above' ? (
                                    <ArrowUp size={14} className="text-emerald-400 flex-shrink-0" />
                                ) : (
                                    <ArrowDown size={14} className="text-red-400 flex-shrink-0" />
                                )}
                                <span className="text-sm text-white flex-1">
                                    Price {alert.type === 'above' ? 'rises above' : 'falls below'}{' '}
                                    <span className="font-bold tabular-nums">{formatPrice(alert.price)}</span>
                                </span>
                                <button
                                    onClick={() => onRemove(alert.id)}
                                    className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                    title="Delete alert"
                                >
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        ))}

                        {triggeredAlerts.length > 0 && (
                            <>
                                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pt-2">Triggered</div>
                                {triggeredAlerts.map(alert => (
                                    <div key={alert.id} className="flex items-center gap-2 p-2.5 bg-emerald-500/[0.04] rounded-lg border border-emerald-500/15">
                                        <BellRing size={14} className="text-emerald-400 flex-shrink-0" />
                                        <span className="text-sm text-slate-400 flex-1">
                                            {alert.type === 'above' ? 'Rose above' : 'Fell below'}{' '}
                                            <span className="font-bold tabular-nums text-slate-300">{formatPrice(alert.price)}</span>
                                            {alert.triggeredAt && (
                                                <span className="text-[10px] text-slate-600 ml-2">
                                                    {new Date(alert.triggeredAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => onRemove(alert.id)}
                                            className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                                            title="Dismiss"
                                        >
                                            <X size={13} />
                                        </button>
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}

                {/* New alert form */}
                <div className="border-t border-white/[0.06] pt-4">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">New Alert</div>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                        <button
                            type="button"
                            onClick={() => setType('above')}
                            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                                type === 'above'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                    : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300'
                            }`}
                        >
                            <ArrowUp size={13} /> Rises above
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('below')}
                            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all border ${
                                type === 'below'
                                    ? 'bg-red-500/15 text-red-400 border-red-500/30'
                                    : 'bg-white/[0.03] text-slate-500 border-white/[0.06] hover:text-slate-300'
                            }`}
                        >
                            <ArrowDown size={13} /> Falls below
                        </button>
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">{cs.trim() || '$'}</span>
                            <input
                                type="number"
                                step="any"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder={item.price.toFixed(2)}
                                className="w-full pl-8 pr-3 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 tabular-nums text-sm"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleAddClick(); }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleAddClick}
                            disabled={!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0}
                            className="px-4 py-2.5 text-sm font-bold bg-cyan-500 hover:bg-cyan-400 disabled:bg-white/[0.05] disabled:text-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                        >
                            Add
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
