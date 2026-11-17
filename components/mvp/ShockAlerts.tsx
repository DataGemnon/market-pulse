'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Zap, ChevronDown, ChevronUp, ExternalLink, Bell } from 'lucide-react';
import type { ShockWithExplanation } from '@/lib/shocks/service';
import type { ImpactRow } from '@/lib/shocks/impact';
import { getNotificationPermission, requestNotificationPermission, sendNotification } from '@/lib/notifications';
import InfoNotice from './InfoNotice';
import { CARD, fmtPct, moveColor, parisDateTime } from './format';

type ShocksResponse = { shocks: ShockWithExplanation[]; liveScan: boolean; aiEnabled: boolean };

const POLL_MS = 60_000;
const NOTIFIED_KEY = 'augur-notified-shocks';

const SEVERITY_STYLE: Record<ShockWithExplanation['severity'], string> = {
    modéré: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    fort: 'text-orange-300 bg-orange-500/10 border-orange-500/20',
    extrême: 'text-red-300 bg-red-500/10 border-red-500/20',
};

function readNotified(): Set<string> {
    try { return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]')); } catch { return new Set(); }
}

function WatchlistImpact({ shockId, watchlist }: { shockId: string; watchlist: string[] }) {
    const [rows, setRows] = useState<ImpactRow[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/shocks/impact', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shockId, symbols: watchlist }),
        })
            .then(res => (res.ok ? res.json() : { rows: [] }))
            .then(data => { if (!cancelled) setRows(data.rows ?? []); })
            .catch(() => { if (!cancelled) setRows([]); });
        return () => { cancelled = true; };
    }, [shockId, watchlist]);

    if (rows === null) return <div className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />;
    if (rows.length === 0) return <p className="text-sm text-slate-500">Ajoute des titres à ta watchlist pour voir l&apos;impact sur eux.</p>;
    return (
        <ul className="space-y-2">
            {rows.map(row => (
                <li key={row.symbol} className="rounded-xl bg-white/[0.03] p-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="font-semibold text-white">{row.symbol}</span>
                        <span className="text-xs text-slate-400">
                            attendu <span className={moveColor(row.expectedMovePct)}>{fmtPct(row.expectedMovePct)}</span>
                            {row.dayChangePct !== null && <> · jour <span className={moveColor(row.dayChangePct)}>{fmtPct(row.dayChangePct)}</span></>}
                        </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed">{row.reading}</p>
                </li>
            ))}
        </ul>
    );
}

function ShockCard({ shock, watchlist, defaultOpen }: { shock: ShockWithExplanation; watchlist: string[]; defaultOpen: boolean }) {
    const [open, setOpen] = useState(defaultOpen);
    const { explanation } = shock;
    return (
        <div className="p-5">
            <button onClick={() => setOpen(!open)} className="w-full text-left">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${SEVERITY_STYLE[shock.severity]}`}>
                        Choc {shock.severity}
                    </span>
                    <span className="text-xs text-slate-500">{parisDateTime(shock.startedAt)} (heure de Paris)</span>
                    <span className="ml-auto text-slate-500">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
                </div>
                <h3 className="font-semibold text-white leading-snug">{explanation.cause}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                    {shock.assets.map(asset => (
                        <span key={asset.symbol} className="text-slate-400">
                            {asset.label} <span className={moveColor(asset.movePct)}>{fmtPct(asset.movePct, 2)}</span>
                        </span>
                    ))}
                    <span className="text-slate-600">en 5 min</span>
                </div>
            </button>

            {open && (
                <div className="mt-4 space-y-4">
                    <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1">Ce que dit le marché</p>
                        <p className="text-sm text-slate-300 leading-relaxed">{explanation.pattern}</p>
                        {explanation.status === 'ok' && explanation.lesson && (
                            <p className="text-sm text-slate-300 leading-relaxed mt-2">{explanation.lesson}</p>
                        )}
                    </div>

                    {explanation.channels.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Qui est touché, et comment</p>
                            <ul className="space-y-1">
                                {explanation.channels.map(channel => (
                                    <li key={channel.segment} className="text-sm text-slate-400">
                                        <span className="text-slate-200">{channel.segment}</span> : {channel.effect}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Ta watchlist face à ce choc</p>
                        <WatchlistImpact shockId={shock.id} watchlist={watchlist} />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>Cause : {explanation.confidence}</span>
                        {explanation.sources.map(source => (
                            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                                {source.title.slice(0, 60)} <ExternalLink size={11} />
                            </a>
                        ))}
                        {explanation.status === 'ai_unavailable' && <span>Recherche automatique de la cause indisponible pour le moment.</span>}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ShockAlerts({ watchlist }: { watchlist: string[] }) {
    const [data, setData] = useState<ShocksResponse | null>(null);
    const [permission, setPermission] = useState<string>('default');
    const notified = useRef<Set<string>>(new Set());

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/shocks');
            setPermission(getNotificationPermission());
            if (!res.ok) return;
            const next = (await res.json()) as ShocksResponse;
            setData(next);
            // Notify once per strong shock, only for recent ones (not history on first load)
            for (const shock of next.shocks) {
                const fresh = Date.now() / 1000 - shock.startedAt < 3600;
                if (shock.severity !== 'modéré' && fresh && !notified.current.has(shock.id)) {
                    sendNotification({ title: `Choc de marché ${shock.severity}`, body: shock.explanation.cause, tag: shock.id });
                    notified.current.add(shock.id);
                }
            }
            try { localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified.current].slice(-50))); } catch { /* private mode */ }
        } catch { /* keep the last data */ }
    }, []);

    useEffect(() => {
        notified.current = readNotified();
        const first = setTimeout(load, 0);
        const timer = setInterval(load, POLL_MS);
        return () => { clearTimeout(first); clearInterval(timer); };
    }, [load]);

    const shocks = data?.shocks ?? [];
    return (
        <section className={CARD} aria-label="Alertes de choc de marché">
            <div className="p-5 border-b border-white/[0.06] flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-400 mt-0.5" />
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Chocs de marché</h2>
                    <p className="text-sm text-slate-400">
                        Quand actions, devises et or décrochent ensemble en quelques minutes, on te dit pourquoi et ce que ça change pour ta watchlist.
                    </p>
                </div>
                {permission === 'default' && (
                    <button
                        onClick={async () => setPermission(await requestNotificationPermission())}
                        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/[0.06] text-slate-200 hover:bg-white/[0.1]"
                    >
                        <Bell size={13} /> Me prévenir
                    </button>
                )}
            </div>

            {data === null ? (
                <div className="p-5"><div className="h-20 rounded-xl bg-white/[0.03] animate-pulse" /></div>
            ) : shocks.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">
                    Aucun choc sur les 3 derniers jours. Panier surveillé : S&amp;P 500, Nasdaq 100, Euro Stoxx 50, EUR/USD, USD/JPY, or, bitcoin.
                </p>
            ) : (
                <div className="divide-y divide-white/[0.04]">
                    {shocks.map((shock, index) => (
                        <ShockCard key={shock.id} shock={shock} watchlist={watchlist} defaultOpen={index === 0} />
                    ))}
                </div>
            )}

            <InfoNotice>
                {data && !data.liveScan && 'Détection sur données différées de quelques heures (surveillance minute par minute pas encore activée).'}
            </InfoNotice>
        </section>
    );
}
