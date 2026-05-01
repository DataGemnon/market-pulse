'use client';

import { AnalystConsensus } from '@/types';

interface AnalystFeedProps {
    consensus: AnalystConsensus[];
    summaries?: Record<string, string>;
}

// ── Score helpers ──────────────────────────────────────────────
function calcScore(c: AnalystConsensus): number {
    const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell;
    if (total === 0) return 50;
    const weighted = c.strongBuy * 2 + c.buy * 1 - c.sell * 1 - c.strongSell * 2;
    return Math.round(((weighted / (total * 2)) + 1) / 2 * 100);
}

function scoreColor(score: number): string {
    if (score >= 65) return '#34d399'; // emerald
    if (score >= 40) return '#fbbf24'; // amber
    return '#f87171';                  // red
}

function scoreLabel(score: number): { text: string; classes: string } {
    if (score >= 65) return { text: 'BULLISH',  classes: 'text-emerald-400 bg-emerald-500/10' };
    if (score >= 40) return { text: 'MIXED',    classes: 'text-yellow-400 bg-yellow-500/10'  };
    return                { text: 'BEARISH',  classes: 'text-red-400 bg-red-500/10'       };
}

// ── Arc gauge SVG ──────────────────────────────────────────────
const ARC_R  = 34;
const ARC_LEN = Math.PI * ARC_R; // ≈ 106.8

function ScoreGauge({ score }: { score: number }) {
    const color  = scoreColor(score);
    const offset = ARC_LEN * (1 - score / 100);
    const cx = 40, cy = 42;
    const x1 = cx - ARC_R, x2 = cx + ARC_R;

    return (
        <svg width="80" height="48" viewBox="0 0 80 48" className="flex-shrink-0">
            {/* Track */}
            <path
                d={`M ${x1},${cy} A ${ARC_R},${ARC_R} 0 0,1 ${x2},${cy}`}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="7"
                strokeLinecap="round"
            />
            {/* Fill */}
            <path
                d={`M ${x1},${cy} A ${ARC_R},${ARC_R} 0 0,1 ${x2},${cy}`}
                fill="none"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${ARC_LEN} 9999`}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
            />
            {/* Score number */}
            <text
                x={cx} y={cy - 4}
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
                {score}
            </text>
            {/* /100 label */}
            <text
                x={cx} y={cy + 9}
                textAnchor="middle"
                fill="#64748b"
                fontSize="8"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
                /100
            </text>
        </svg>
    );
}

// ── Main component ─────────────────────────────────────────────
const AnalystFeed = ({ consensus, summaries }: AnalystFeedProps) => {
    if (consensus.length === 0) {
        return (
            <div className="p-6 text-center text-slate-500 text-sm">
                No analyst data found. Add stocks to your watchlist.
            </div>
        );
    }

    return (
        <div className="p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg">Analyst Sentiment</h3>
                <span className="text-[10px] text-slate-600 uppercase tracking-widest">Wall St. consensus</span>
            </div>

            <div className="space-y-2">
                {consensus.map((c, idx) => {
                    const total = c.strongBuy + c.buy + c.hold + c.sell + c.strongSell;
                    if (total === 0) return null;

                    const score   = calcScore(c);
                    const color   = scoreColor(score);
                    const label   = scoreLabel(score);
                    const bulls   = c.strongBuy + c.buy;
                    const bears   = c.sell + c.strongSell;
                    const summary = summaries?.[c.symbol];

                    return (
                        <div
                            key={idx}
                            className="p-3 rounded-xl border border-transparent hover:bg-white/[0.02] hover:border-white/[0.05] transition-all duration-200"
                        >
                            <div className="flex items-start gap-3">
                                {/* Gauge */}
                                <ScoreGauge score={score} />

                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                    {/* Symbol + badge */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-white text-sm">{c.symbol}</span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${label.classes}`}>
                                            {label.text}
                                        </span>
                                    </div>

                                    {/* AI summary or skeleton */}
                                    {summary ? (
                                        <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                                            {summary}
                                        </p>
                                    ) : (
                                        <div className="h-3 w-32 rounded bg-white/[0.04] animate-pulse mb-2" />
                                    )}

                                    {/* Consensus bar */}
                                    <div className="flex h-1 rounded-full overflow-hidden bg-white/[0.04] mb-1.5">
                                        {c.strongBuy > 0 && (
                                            <div className="bg-emerald-400" style={{ width: `${(c.strongBuy / total) * 100}%` }} />
                                        )}
                                        {c.buy > 0 && (
                                            <div className="bg-emerald-600/70" style={{ width: `${(c.buy / total) * 100}%` }} />
                                        )}
                                        {c.hold > 0 && (
                                            <div className="bg-yellow-500/60" style={{ width: `${(c.hold / total) * 100}%` }} />
                                        )}
                                        {c.sell > 0 && (
                                            <div className="bg-red-500/60" style={{ width: `${(c.sell / total) * 100}%` }} />
                                        )}
                                        {c.strongSell > 0 && (
                                            <div className="bg-red-400" style={{ width: `${(c.strongSell / total) * 100}%` }} />
                                        )}
                                    </div>

                                    {/* Raw counts */}
                                    <div className="text-[10px] text-slate-600">
                                        {bulls} Buy · {c.hold} Hold · {bears} Sell
                                        <span className="ml-1.5" style={{ color }}>
                                            · {total} analysts
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AnalystFeed;
