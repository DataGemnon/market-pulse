'use client';

interface AugurBadgeProps {
    size?: number;
}

// Focal point of the signal arcs (bottom-center of the mark)
const FX = 110;
const FY = 150;

// Four arc radii
const ARCS = [
    { r: 22, sw: 2.4, op: 0.45 },
    { r: 42, sw: 2.1, op: 0.62 },
    { r: 62, sw: 1.8, op: 0.80 },
    { r: 82, sw: 1.5, op: 1.00 },
];

export default function AugurBadge({ size = 220 }: AugurBadgeProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 220 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Vertical gradient: cyan at focal point → purple → pink at top */}
                <linearGradient id="ab-arc" x1={FX} y1={FY} x2={FX} y2={FY - 82}
                    gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#22d3ee" />
                    <stop offset="55%"  stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>

                {/* Wordmark gradient: left-to-right */}
                <linearGradient id="ab-wm" x1="60" y1="0" x2="160" y2="0"
                    gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#22d3ee" />
                    <stop offset="60%"  stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>

                {/* Focal glow */}
                <filter id="ab-glow" x="-150%" y="-150%" width="400%" height="400%">
                    <feGaussianBlur stdDeviation="5" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="ab-glow-sm" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="2.5" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* ── Horizon line ── */}
            <line
                x1={FX - 90} y1={FY} x2={FX + 90} y2={FY}
                stroke="url(#ab-arc)" strokeWidth="0.6" opacity="0.18"
                strokeDasharray="3 4"
            />

            {/* ── Signal arcs ── */}
            {ARCS.map((arc, i) => (
                <path
                    key={i}
                    d={`M ${FX - arc.r},${FY} A ${arc.r},${arc.r} 0 0,1 ${FX + arc.r},${FY}`}
                    stroke="url(#ab-arc)"
                    strokeWidth={arc.sw}
                    strokeLinecap="round"
                    opacity={arc.op}
                />
            ))}

            {/* ── Arc midpoint nodes (top of each arc) ── */}
            {ARCS.map((arc, i) => (
                <circle
                    key={i}
                    cx={FX}
                    cy={FY - arc.r}
                    r={i === ARCS.length - 1 ? 2.5 : 2}
                    fill="url(#ab-arc)"
                    opacity={arc.op}
                    filter="url(#ab-glow-sm)"
                />
            ))}

            {/* ── Outer arc endpoint dots ── */}
            {ARCS.slice(1).map((arc, i) => (
                <g key={i}>
                    <circle cx={FX - arc.r} cy={FY} r={1.5 + i * 0.3}
                        fill="url(#ab-arc)" opacity={arc.op * 0.7} />
                    <circle cx={FX + arc.r} cy={FY} r={1.5 + i * 0.3}
                        fill="url(#ab-arc)" opacity={arc.op * 0.7} />
                </g>
            ))}

            {/* ── Focal point ── */}
            <circle cx={FX} cy={FY} r={14} fill="url(#ab-arc)" opacity={0.08} />
            <circle cx={FX} cy={FY} r={7}  fill="url(#ab-arc)" opacity={0.18} />
            <circle cx={FX} cy={FY} r={4}  fill="url(#ab-arc)" filter="url(#ab-glow)" />
            <circle cx={FX} cy={FY} r={2}  fill="white" opacity={0.95} />

            {/* ── Wordmark: "augur" lowercase ── */}
            <text
                x={FX}
                y={196}
                textAnchor="middle"
                fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
                fontSize="28"
                fontWeight="800"
                letterSpacing="6"
                fill="url(#ab-wm)"
            >
                augur
            </text>
        </svg>
    );
}
