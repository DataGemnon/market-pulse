'use client';

import { useState, useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';

interface BriefResponse {
    brief: string | null;
    sunday?: boolean;
}

async function fetchBrief(watchlist: string[]): Promise<BriefResponse> {
    const res = await fetch('/api/morning-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist }),
    });
    if (!res.ok) return { brief: null };
    return res.json();
}

interface MorningBriefProps {
    watchlist: string[];
    enabled: boolean;
}

export default function MorningBrief({ watchlist, enabled }: MorningBriefProps) {
    const [brief, setBrief]       = useState<string | null>(null);
    const [loading, setLoading]   = useState(false);
    const [isSunday, setIsSunday] = useState(false);
    // Store the calendar date we last fetched so we re-fetch on a new day
    const fetchedDate = useRef<string | null>(null);

    useEffect(() => {
        if (!enabled || watchlist.length === 0) return;

        const today = new Date().toDateString(); // e.g. "Mon May 05 2026"
        if (fetchedDate.current === today) return; // already fetched today

        fetchedDate.current = today;
        setLoading(true);
        fetchBrief(watchlist)
            .then(data => {
                setIsSunday(data.sunday ?? false);
                setBrief(data.brief ?? null);
            })
            .catch(() => setBrief(null))
            .finally(() => setLoading(false));
    }, [enabled, watchlist]);

    if (!enabled) return null;

    return (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/10 bg-gradient-to-r from-amber-500/[0.05] via-orange-500/[0.03] to-transparent backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent pointer-events-none" />

            <div className="relative px-5 py-4 flex gap-4 items-start">
                <div className="flex-shrink-0 mt-0.5">
                    {isSunday
                        ? <div className="p-2 rounded-xl bg-slate-500/10 border border-slate-500/15"><Moon size={16} className="text-slate-500" /></div>
                        : <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/15"><Sun size={16} className="text-amber-400" /></div>
                    }
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-amber-400/80 uppercase tracking-widest">Morning Brief</span>
                        <span className="text-[10px] text-slate-600">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                        </span>
                    </div>

                    {isSunday && (
                        <p className="text-sm text-slate-500 leading-relaxed">
                            Markets are closed today — enjoy your Sunday. See you Monday!
                        </p>
                    )}

                    {loading && !isSunday && (
                        <div className="space-y-2">
                            <div className="h-3 w-full rounded bg-white/[0.05] animate-pulse" />
                            <div className="h-3 w-5/6 rounded bg-white/[0.04] animate-pulse" />
                            <div className="h-3 w-4/6 rounded bg-white/[0.03] animate-pulse" />
                        </div>
                    )}

                    {!loading && brief && (
                        <p className="text-sm text-slate-300 leading-relaxed">{brief}</p>
                    )}

                    {!loading && !brief && !isSunday && (
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Brief unavailable right now — check back in a moment.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
