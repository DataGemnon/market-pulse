interface AugurLogoProps {
    size?: number;
    className?: string;
}

export default function AugurLogo({ size = 34, className }: AugurLogoProps) {
    // Three signal arcs rising from a focal point — compact navbar version
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="al-arc" x1="18" y1="33" x2="18" y2="6" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#22d3ee" />
                    <stop offset="55%"  stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
                <filter id="al-glow" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="1.5" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
            </defs>

            {/* Inner arc */}
            <path d="M 12,32 A 6,6 0 0,1 24,32"
                stroke="url(#al-arc)" strokeWidth="2.2" strokeLinecap="round" opacity="0.45" />

            {/* Middle arc */}
            <path d="M 7,32 A 11,11 0 0,1 29,32"
                stroke="url(#al-arc)" strokeWidth="1.9" strokeLinecap="round" opacity="0.7" />

            {/* Outer arc */}
            <path d="M 2,32 A 16,16 0 0,1 34,32"
                stroke="url(#al-arc)" strokeWidth="1.6" strokeLinecap="round" />

            {/* Focal point glow */}
            <circle cx="18" cy="32" r="4" fill="url(#al-arc)" opacity="0.15" />
            <circle cx="18" cy="32" r="2.2" fill="url(#al-arc)" filter="url(#al-glow)" />
            <circle cx="18" cy="32" r="1"   fill="white" opacity="0.95" />

            {/* Outer arc endpoint dots */}
            <circle cx="2"  cy="32" r="1.4" fill="#22d3ee" opacity="0.55" />
            <circle cx="34" cy="32" r="1.4" fill="#ec4899" opacity="0.55" />
        </svg>
    );
}
