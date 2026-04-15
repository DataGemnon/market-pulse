'use client';

import { UpcomingEarnings } from '@/types';
import { Calendar, Sun, Moon } from 'lucide-react';

interface EarningsCalendarProps {
    earnings: UpcomingEarnings[];
}

function formatDate(dateStr: string): { day: string; month: string; weekday: string; daysUntil: number } {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return {
        day: d.getDate().toString(),
        month: d.toLocaleDateString([], { month: 'short' }).toUpperCase(),
        weekday: d.toLocaleDateString([], { weekday: 'short' }),
        daysUntil,
    };
}

function relativeLabel(daysUntil: number): string {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil < 7) return `In ${daysUntil} days`;
    if (daysUntil < 14) return 'Next week';
    return `In ${Math.round(daysUntil / 7)} weeks`;
}

export default function EarningsCalendar({ earnings }: EarningsCalendarProps) {
    // Show next 30 days, max 8 entries
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming = earnings
        .filter(e => {
            const d = new Date(e.date);
            return d >= now && d <= cutoff;
        })
        .slice(0, 8);

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.1]">
            <div className="p-5 border-b border-white/[0.06]">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                    <Calendar size={16} className="text-cyan-400" />
                    Upcoming Earnings
                </h3>
                <p className="text-xs text-slate-500 mt-1">Next 30 days from your watchlist</p>
            </div>

            {upcoming.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                    No upcoming earnings reports for your watchlist.
                </div>
            ) : (
                <div className="divide-y divide-white/[0.04]">
                    {upcoming.map((e, i) => {
                        const { day, month, weekday, daysUntil } = formatDate(e.date);
                        const timeLabel = e.time === 'bmo' ? 'Before Open' : e.time === 'amc' ? 'After Close' : null;
                        const TimeIcon = e.time === 'bmo' ? Sun : Moon;

                        return (
                            <div key={`${e.symbol}-${e.date}-${i}`} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                                {/* Date block */}
                                <div className="flex-shrink-0 w-12 text-center bg-white/[0.04] rounded-lg p-2 border border-white/[0.06]">
                                    <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider leading-none">{month}</div>
                                    <div className="text-lg font-bold text-white tabular-nums leading-tight mt-0.5">{day}</div>
                                    <div className="text-[9px] text-slate-500 uppercase leading-none">{weekday}</div>
                                </div>

                                {/* Stock info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white">{e.symbol}</span>
                                        <span className="text-[10px] text-slate-500 font-semibold">{relativeLabel(daysUntil)}</span>
                                    </div>
                                    <div className="text-xs text-slate-500 truncate">{e.name}</div>
                                    <div className="flex items-center gap-3 mt-1">
                                        {timeLabel && (
                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                                                <TimeIcon size={9} />
                                                {timeLabel}
                                            </span>
                                        )}
                                        {e.epsEstimated != null && (
                                            <span className="text-[10px] text-slate-500 tabular-nums">
                                                EPS est. <span className="text-slate-300 font-semibold">${e.epsEstimated.toFixed(2)}</span>
                                            </span>
                                        )}
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
