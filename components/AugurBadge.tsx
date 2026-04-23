'use client';

interface AugurBadgeProps {
    size?: number;
}

const DOTS = 56;
const RING_CX = 110;
const RING_CY = 110;
const RING_R = 97;
const ATOM_CX = 110;
const ATOM_CY = 88;

export default function AugurBadge({ size = 220 }: AugurBadgeProps) {
    const dots = Array.from({ length: DOTS }, (_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DOTS;
        return {
            x: +(RING_CX + RING_R * Math.cos(angle)).toFixed(2),
            y: +(RING_CY + RING_R * Math.sin(angle)).toFixed(2),
            // Subtle variation: dots at top/bottom slightly brighter
            opacity: +(0.28 + 0.22 * Math.abs(Math.sin(angle))).toFixed(2),
        };
    });

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 220 220"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="badge-grad" x1="30" y1="0" x2="190" y2="220" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="badge-text-grad" x1="60" y1="140" x2="160" y2="160" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="nuc-glow" x="-150%" y="-150%" width="400%" height="400%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <filter id="orb-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* ── Dotted ring ── */}
            {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r="1.7" fill="white" fillOpacity={d.opacity} />
            ))}

            {/* ── Atom ── */}
            <g filter="url(#orb-glow)">
                <ellipse cx={ATOM_CX} cy={ATOM_CY} rx="44" ry="16"
                    stroke="url(#badge-grad)" strokeWidth="2" fill="none" />
                <ellipse cx={ATOM_CX} cy={ATOM_CY} rx="44" ry="16"
                    stroke="url(#badge-grad)" strokeWidth="2" fill="none"
                    transform={`rotate(60 ${ATOM_CX} ${ATOM_CY})`} />
                <ellipse cx={ATOM_CX} cy={ATOM_CY} rx="44" ry="16"
                    stroke="url(#badge-grad)" strokeWidth="2" fill="none"
                    transform={`rotate(120 ${ATOM_CX} ${ATOM_CY})`} />
            </g>

            {/* Nucleus */}
            <circle cx={ATOM_CX} cy={ATOM_CY} r="5.5"
                fill="url(#badge-grad)" filter="url(#nuc-glow)" />

            {/* ── AUGUR wordmark ── */}
            {/* Bold chevron replaces the A */}
            <path
                d="M 63 130 L 77 143 L 63 156"
                stroke="url(#badge-text-grad)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            {/* UGUR */}
            <text
                x="84"
                y="156"
                fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
                fontSize="27"
                fontWeight="900"
                letterSpacing="6"
                fill="url(#badge-text-grad)"
            >
                UGUR
            </text>
        </svg>
    );
}
