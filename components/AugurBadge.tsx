'use client';

interface AugurBadgeProps {
    size?: number;
}

// Ring
const DOTS    = 60;
const RING_CX = 110;
const RING_CY = 112;
const RING_R  = 96;

// Molecule icon
const ATOM_CX = 110;
const ATOM_CY = 82;
const ATOM_RX = 36;
const ATOM_RY = 13;

export default function AugurBadge({ size = 220 }: AugurBadgeProps) {

    // Ring dots: top = large + bright, fading toward bottom
    const dots = Array.from({ length: DOTS }, (_, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / DOTS;
        // brightness peaks at the top (angle = -π/2) and fades to near-zero at the bottom
        const brightness = (1 + Math.sin(-angle)) / 2; // 1 at top, 0 at bottom
        return {
            x:  +(RING_CX + RING_R * Math.cos(angle)).toFixed(2),
            y:  +(RING_CY + RING_R * Math.sin(angle)).toFixed(2),
            r:  +(0.6 + 1.6 * brightness).toFixed(2),
            op: +(0.07 + 0.58 * brightness).toFixed(2),
        };
    });

    // Outer nodes: tips of each ellipse (2 per ellipse × 3 ellipses = 6 nodes)
    const nodeAngles = [0, 60, 120];
    const outerNodes = nodeAngles.flatMap(deg => {
        const rad = (deg * Math.PI) / 180;
        return [
            { x: +(ATOM_CX + ATOM_RX * Math.cos(rad)).toFixed(2), y: +(ATOM_CY + ATOM_RX * Math.sin(rad)).toFixed(2) },
            { x: +(ATOM_CX - ATOM_RX * Math.cos(rad)).toFixed(2), y: +(ATOM_CY - ATOM_RX * Math.sin(rad)).toFixed(2) },
        ];
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
                <linearGradient id="bg-grad" x1="30" y1="10" x2="190" y2="210" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <linearGradient id="txt-grad" x1="62" y1="145" x2="162" y2="162" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
                <filter id="glow" x="-150%" y="-150%" width="400%" height="400%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* ── Ring ── */}
            {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="white" fillOpacity={d.op} />
            ))}

            {/* ── Molecule icon ── */}
            {/* Three orbital ellipses */}
            <ellipse cx={ATOM_CX} cy={ATOM_CY} rx={ATOM_RX} ry={ATOM_RY}
                stroke="url(#bg-grad)" strokeWidth="1.6" fill="none" />
            <ellipse cx={ATOM_CX} cy={ATOM_CY} rx={ATOM_RX} ry={ATOM_RY}
                stroke="url(#bg-grad)" strokeWidth="1.6" fill="none"
                transform={`rotate(60 ${ATOM_CX} ${ATOM_CY})`} />
            <ellipse cx={ATOM_CX} cy={ATOM_CY} rx={ATOM_RX} ry={ATOM_RY}
                stroke="url(#bg-grad)" strokeWidth="1.6" fill="none"
                transform={`rotate(120 ${ATOM_CX} ${ATOM_CY})`} />

            {/* Outer nodes at each ellipse tip */}
            {outerNodes.map((n, i) => (
                <circle key={i} cx={n.x} cy={n.y} r="3" fill="url(#bg-grad)" />
            ))}

            {/* Center nucleus */}
            <circle cx={ATOM_CX} cy={ATOM_CY} r="5" fill="url(#bg-grad)" filter="url(#glow)" />

            {/* ── AUGUR wordmark ── */}
            {/* "A" = solid filled right-pointing arrowhead ▶ */}
            <polygon
                points="62,130 62,158 81,144"
                fill="url(#txt-grad)"
            />
            {/* UGUR */}
            <text
                x="87"
                y="158"
                fontFamily="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
                fontSize="27"
                fontWeight="900"
                letterSpacing="4"
                fill="url(#txt-grad)"
            >
                UGUR
            </text>
        </svg>
    );
}
