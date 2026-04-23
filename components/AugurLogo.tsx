interface AugurLogoProps {
    size?: number;
    className?: string;
}

export default function AugurLogo({ size = 36, className }: AugurLogoProps) {
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
                <linearGradient id="aug-orb" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
            </defs>

            {/* Three orbital ellipses — 0°, 60°, 120° */}
            <ellipse
                cx="18" cy="18" rx="16.5" ry="6"
                stroke="url(#aug-orb)" strokeWidth="1.4" fill="none"
            />
            <ellipse
                cx="18" cy="18" rx="16.5" ry="6"
                stroke="url(#aug-orb)" strokeWidth="1.4" fill="none"
                transform="rotate(60 18 18)"
            />
            <ellipse
                cx="18" cy="18" rx="16.5" ry="6"
                stroke="url(#aug-orb)" strokeWidth="1.4" fill="none"
                transform="rotate(120 18 18)"
            />

            {/* Nucleus */}
            <circle cx="18" cy="18" r="2.8" fill="url(#aug-orb)" />
        </svg>
    );
}
