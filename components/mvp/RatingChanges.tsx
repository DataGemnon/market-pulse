'use client';

import { useEffect, useState } from 'react';
import { ArrowLeftRight, ExternalLink } from 'lucide-react';
import type { RatingMove } from '@/lib/ratings/service';
import InfoNotice from './InfoNotice';
import { CARD, fmtPct, moveColor, parisDateTime } from './format';

export default function RatingChanges() {
    const [moves, setMoves] = useState<RatingMove[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/rating-changes')
            .then(res => (res.ok ? res.json() : { moves: [] }))
            .then(data => { if (!cancelled) setMoves(data.moves ?? []); })
            .catch(() => { if (!cancelled) setMoves([]); });
        return () => { cancelled = true; };
    }, []);

    return (
        <section className={CARD} aria-label="Les recos qui changent">
            <div className="p-5 border-b border-white/[0.06] flex items-start gap-3">
                <ArrowLeftRight className="w-5 h-5 text-pink-400 mt-0.5" />
                <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">Les recos qui changent</h2>
                    <p className="text-sm text-slate-400">
                        Grandes valeurs américaines et parisiennes qui s&apos;écartent nettement de leur marché aujourd&apos;hui à la suite d&apos;un changement de recommandation d&apos;analyste.
                    </p>
                </div>
            </div>

            {moves === null ? (
                <div className="p-5"><div className="h-20 rounded-xl bg-white/[0.03] animate-pulse" /></div>
            ) : moves.length === 0 ? (
                <p className="p-5 text-sm text-slate-400">Aucun mouvement net lié à une recommandation repéré pour l&apos;instant.</p>
            ) : (
                <ul className="divide-y divide-white/[0.04]">
                    {moves.map(move => (
                        <li key={`${move.symbol}-${move.url}`} className="p-5">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-white">{move.name}</span>
                                <span className="text-xs text-slate-500">{move.symbol} · {move.market}</span>
                                <span className={`ml-auto text-sm font-semibold ${moveColor(move.changePct)}`}>{fmtPct(move.changePct)}</span>
                            </div>
                            <p className="text-sm text-slate-300">
                                <span className="text-slate-100">{move.actionLabel}</span>
                                {move.broker && <> par {move.broker}</>}
                                {move.toRating && <> : {move.fromRating ? `${move.fromRating} → ` : ''}{move.toRating}</>}
                                {move.priceTarget && <> (objectif de l&apos;analyste : {move.priceTarget})</>}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                Le marché fait {fmtPct(move.marketChangePct)} sur la même séance.{' '}
                                <a href={move.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300">
                                    {move.headline.slice(0, 90)} <ExternalLink size={11} />
                                </a>{' '}
                                · {parisDateTime(move.publishedAt)}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
            <InfoNotice>
                Sélection, pas une liste exhaustive : on ne montre que les recommandations qui ont fait bouger le cours, trouvées dans la presse. L&apos;avis cité est celui de l&apos;analyste, pas le nôtre.
            </InfoNotice>
        </section>
    );
}
