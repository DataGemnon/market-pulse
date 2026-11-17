'use client';

import { useEffect, useState } from 'react';
import { FileText, ExternalLink, Sparkles } from 'lucide-react';
import type { WatchlistEvent } from '@/lib/filings/types';
import InfoNotice from './InfoNotice';
import { CARD, parisDateTime } from './format';

type Decoded = { status: 'ok' | 'ai_unavailable' | 'error'; summary: string; keyPoints: string[]; whyItMatters: string };

function DecodeButton({ event }: { event: WatchlistEvent }) {
    const [state, setState] = useState<'idle' | 'loading' | Decoded>('idle');

    const decode = async () => {
        setState('loading');
        try {
            const res = await fetch('/api/filings/decode', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: event.docUrl, symbol: event.symbol, title: event.title }),
            });
            setState(res.ok ? await res.json() : { status: 'error', summary: '', keyPoints: [], whyItMatters: '' });
        } catch {
            setState({ status: 'error', summary: '', keyPoints: [], whyItMatters: '' });
        }
    };

    if (state === 'idle') {
        return (
            <button onClick={decode} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300">
                <Sparkles size={12} /> Décoder le document
            </button>
        );
    }
    if (state === 'loading') return <span className="text-xs text-slate-500">Lecture du document…</span>;
    if (state.status !== 'ok') {
        return (
            <span className="text-xs text-slate-500">
                {state.status === 'ai_unavailable' ? 'Décodage automatique indisponible pour le moment.' : 'Décodage impossible pour ce document.'}
            </span>
        );
    }
    return (
        <div className="mt-2 rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 space-y-2">
            <p className="text-sm text-slate-200 leading-relaxed">{state.summary}</p>
            {state.keyPoints.length > 0 && (
                <ul className="list-disc pl-5 text-sm text-slate-400 space-y-0.5">
                    {state.keyPoints.map(point => <li key={point}>{point}</li>)}
                </ul>
            )}
            {state.whyItMatters && <p className="text-sm text-slate-400"><span className="text-slate-300">Pourquoi ça compte : </span>{state.whyItMatters}</p>}
        </div>
    );
}

export default function WatchlistEvents({ watchlist }: { watchlist: string[] }) {
    const [events, setEvents] = useState<WatchlistEvent[] | null>(null);
    const [showRoutine, setShowRoutine] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/watchlist-events', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: watchlist }),
        })
            .then(res => (res.ok ? res.json() : { events: [] }))
            .then(data => { if (!cancelled) setEvents(data.events ?? []); })
            .catch(() => { if (!cancelled) setEvents([]); });
        return () => { cancelled = true; };
    }, [watchlist]);

    const visible = (events ?? []).filter(e => showRoutine || e.important);
    const hiddenCount = (events ?? []).length - (events ?? []).filter(e => e.important).length;

    return (
        <section className={CARD} aria-label="Publications officielles de ta watchlist">
            <div className="p-5 border-b border-white/[0.06] flex items-start gap-3">
                <FileText className="w-5 h-5 text-purple-400 mt-0.5" />
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Ce que tes sociétés ont publié</h2>
                    <p className="text-sm text-slate-400">
                        Les documents officiels des 30 derniers jours, à la source : SEC pour les actions américaines, AMF pour les françaises.
                    </p>
                </div>
            </div>

            {events === null ? (
                <div className="p-5"><div className="h-20 rounded-xl bg-white/[0.03] animate-pulse" /></div>
            ) : visible.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">Aucune publication importante sur 30 jours pour ta watchlist.</p>
            ) : (
                <ul className="divide-y divide-white/[0.04]">
                    {visible.slice(0, 25).map(event => (
                        <li key={event.id} className="p-5">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-xs font-bold text-white">{event.symbol}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400">{event.source}</span>
                                <span className="text-xs text-slate-500">{parisDateTime(event.publishedAt)}</span>
                                <a href={event.url} target="_blank" rel="noopener noreferrer" className="ml-auto text-slate-500 hover:text-slate-300" aria-label="Voir le document officiel">
                                    <ExternalLink size={13} />
                                </a>
                            </div>
                            <p className="font-medium text-slate-100 leading-snug">{event.title}</p>
                            {event.detail && event.detail !== event.title && <p className="text-sm text-slate-400 mt-1">{event.detail}</p>}
                            {event.lesson && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{event.lesson}</p>}
                            <div className="mt-2"><DecodeButton event={event} /></div>
                        </li>
                    ))}
                </ul>
            )}

            {hiddenCount > 0 && (
                <button onClick={() => setShowRoutine(!showRoutine)} className="w-full px-5 py-2 text-xs text-slate-500 hover:text-slate-300 border-t border-white/[0.04]">
                    {showRoutine ? 'Masquer les publications de routine' : `Afficher aussi ${hiddenCount} publication(s) de routine`}
                </button>
            )}
            <InfoNotice />
        </section>
    );
}
