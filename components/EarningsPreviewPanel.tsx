'use client';

import { CalendarClock, Sunrise, Moon, Clock } from 'lucide-react';
import type { EarningsPreviewResult } from '@/actions/earnings-preview';

interface EarningsPreviewPanelProps {
    previews: EarningsPreviewResult[];
    loading?: boolean;
}

function dayOffset(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

export default function EarningsPreviewPanel({ previews, loading }: EarningsPreviewPanelProps) {
    if (!loading && previews.length === 0) return null;

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-purple-500/[0.12] overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                    <CalendarClock size={14} className="text-purple-400" />
                </div>
                <h3 className="font-bold text-white text-sm">Earnings Preview</h3>
                {!loading && (
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-purple-400/70 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/15">
                        {previews.length} report{previews.length !== 1 ? 's' : ''}
                    </span>
                )}
            </div>

            {/* Loading skeleton */}
            {loading && (
                <div className="divide-y divide-white/[0.04]">
                    {[1, 2].map(i => (
                        <div key={i} className="px-5 py-4 flex gap-4 items-start animate-pulse">
                            <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-white/[0.04] rounded w-1/3" />
                                <div className="h-3 bg-white/[0.04] rounded w-4/5" />
                                <div className="h-2.5 bg-white/[0.03] rounded w-1/4" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results */}
            {!loading && (
                <div className="divide-y divide-white/[0.04]">
                    {previews.map((p) => {
                        const offset = dayOffset(p.date);
                        const isToday = offset === 0;
                        const TimeIcon =
                            p.time === 'bmo' ? Sunrise :
                            p.time === 'amc' ? Moon : Clock;
                        const timeLabel =
                            p.time === 'bmo' ? 'Before market open' :
                            p.time === 'amc' ? 'After market close' : 'Time TBD';

                        return (
                            <div
                                key={p.symbol}
                                className="px-5 py-4 flex gap-4 items-start hover:bg-white/[0.02] transition-colors"
                            >
                                {/* Icon */}
                                <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-gradient-to-br from-purple-500/15 to-pink-500/15 border border-white/[0.06] flex items-center justify-center font-bold text-xs text-purple-400">
                                    {p.symbol.slice(0, 2)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                        <span className="text-sm font-bold text-white">{p.symbol}</span>
                                        <span className="text-[11px] text-slate-500 truncate">{p.name}</span>
                                        <span
                                            className={`ml-auto flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                                isToday
                                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                                                    : 'bg-purple-500/10 text-purple-400 border-purple-500/15'
                                            }`}
                                        >
                                            {isToday ? 'Today' : 'Tomorrow'}
                                        </span>
                                    </div>

                                    <p className="text-[12px] text-slate-300 leading-relaxed mb-1.5">
                                        {p.preview}
                                    </p>

                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                                        <TimeIcon size={10} />
                                        <span>{timeLabel}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
