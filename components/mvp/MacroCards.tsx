'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, ExternalLink } from 'lucide-react';
import InfoNotice from './InfoNotice';
import { CARD, fmtPct, moveColor, parisDateTime } from './format';

type MacroEventView = { type: string; at: string; confirmed: boolean; name: string; official: string; lesson: string };
type SensitivityRow = { symbol: string; ratio: number | null; last: { date: string; movePct: number } | null; reading: string };
type MacroResponse = { events: MacroEventView[]; sensitivity: Record<string, SensitivityRow[]> };

export default function MacroCards({ watchlist }: { watchlist: string[] }) {
    const [data, setData] = useState<MacroResponse | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/macro', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: watchlist }),
        })
            .then(res => (res.ok ? res.json() : null))
            .then(json => { if (!cancelled) setData(json); })
            .catch(() => { if (!cancelled) setData(null); });
        return () => { cancelled = true; };
    }, [watchlist]);

    return (
        <section className={CARD} aria-label="Rendez-vous macro">
            <div className="p-5 border-b border-white/[0.06] flex items-start gap-3">
                <CalendarClock className="w-5 h-5 text-cyan-400 mt-0.5" />
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Rendez-vous macro</h2>
                    <p className="text-sm text-slate-400">Les prochaines annonces qui font bouger les marchés, et comment tes titres ont réagi les fois précédentes.</p>
                </div>
            </div>

            {data === null ? (
                <div className="p-5"><div className="h-20 rounded-xl bg-white/[0.03] animate-pulse" /></div>
            ) : data.events.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">Pas de grande annonce prévue dans les 45 prochains jours.</p>
            ) : (
                <ul className="divide-y divide-white/[0.04]">
                    {data.events.slice(0, 6).map(event => {
                        const rows = (data.sensitivity[event.type] ?? []).filter(r => r.ratio !== null)
                            .sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0));
                        return (
                            <li key={`${event.type}-${event.at}`} className="p-5">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">{event.type}</span>
                                    <span className="text-xs text-slate-400">{parisDateTime(event.at)}{!event.confirmed && ' (date à confirmer)'}</span>
                                    <a href={event.official} target="_blank" rel="noopener noreferrer" className="ml-auto text-slate-500 hover:text-slate-300" aria-label="Calendrier officiel">
                                        <ExternalLink size={13} />
                                    </a>
                                </div>
                                <p className="font-medium text-slate-100">{event.name}</p>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.lesson}</p>
                                {rows.length > 0 && (
                                    <ul className="mt-3 space-y-1.5">
                                        {rows.slice(0, 5).map(row => (
                                            <li key={row.symbol} className="text-sm text-slate-400 leading-relaxed">
                                                {row.reading}
                                                {row.last && (
                                                    <span className="text-slate-500"> La dernière fois : <span className={moveColor(row.last.movePct)}>{fmtPct(row.last.movePct)}</span>.</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            <InfoNotice>Mouvements passés mesurés en clôture, ils ne prédisent pas la prochaine réaction.</InfoNotice>
        </section>
    );
}
