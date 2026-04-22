interface WizardLogoProps {
    size?: number;
    className?: string;
}

export default function WizardLogo({ size = 40, className }: WizardLogoProps) {
    const h = Math.round(size * 1.22);

    return (
        <svg
            width={size}
            height={h}
            viewBox="0 0 40 49"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="wiz-hat" x1="20" y1="0" x2="20" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
                <linearGradient id="wiz-brim" x1="6" y1="24" x2="34" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0284c7" />
                    <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
                <radialGradient id="wiz-face" cx="45%" cy="38%" r="65%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="100%" stopColor="#f59e0b" />
                </radialGradient>
            </defs>

            {/* ── HAT ── */}
            {/* Cone body — tip slightly off-center for a quirky Gandalf feel */}
            <path
                d="M22 1.5 C21.5 4.5 19 10.5 16.5 16.5 C14.5 20.5 11.5 22.5 10.5 24 L30.5 24 C29.5 22.5 27 20.5 25 16.5 C22.5 10.5 22.5 4.5 22 1.5 Z"
                fill="url(#wiz-hat)"
            />
            {/* Brim */}
            <ellipse cx="20.5" cy="24" rx="13" ry="4" fill="url(#wiz-brim)" />
            {/* Band highlight */}
            <path
                d="M11 22.5 Q20.5 20.5 30 22.5"
                stroke="white"
                strokeWidth="1.4"
                strokeOpacity="0.22"
                strokeLinecap="round"
                fill="none"
            />

            {/* ── STAR (properly computed 5-pointed, centred at 22,9, R=3.2, r=1.3) ── */}
            <path
                d="M22 5.8 L22.77 7.99 L25.14 7.99 L23.27 9.37 L23.99 11.57 L22 10.18 L20.01 11.57 L20.73 9.37 L18.86 7.99 L21.23 7.99 Z"
                fill="white"
                fillOpacity="0.92"
            />

            {/* Tiny sparkles on hat */}
            <circle cx="15" cy="14.5" r="1.1" fill="white" fillOpacity="0.55" />
            <circle cx="17.5" cy="7.5" r="0.7" fill="white" fillOpacity="0.4" />
            <circle cx="27.5" cy="12" r="0.9" fill="white" fillOpacity="0.5" />

            {/* ── FACE ── */}
            <circle cx="20" cy="37.5" r="10.5" fill="url(#wiz-face)" />

            {/* Rosy cheeks */}
            <circle cx="13.5" cy="40" r="3.8" fill="#f43f5e" fillOpacity="0.18" />
            <circle cx="26.5" cy="40" r="3.8" fill="#f43f5e" fillOpacity="0.18" />

            {/* Eyes — big, with sparkle */}
            <circle cx="16" cy="35.5" r="3" fill="#1c1028" />
            <circle cx="24" cy="35.5" r="3" fill="#1c1028" />
            {/* Eye shine */}
            <circle cx="17.1" cy="34.2" r="1.15" fill="white" />
            <circle cx="25.1" cy="34.2" r="1.15" fill="white" />

            {/* Eyebrows — slightly raised = friendly + a bit surprised */}
            <path
                d="M12.8 31 Q16 29.4 19.2 31.2"
                stroke="#92400e"
                strokeWidth="1.55"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M20.8 31.2 Q24 29.4 27.2 31"
                stroke="#92400e"
                strokeWidth="1.55"
                strokeLinecap="round"
                fill="none"
            />

            {/* Nose — subtle */}
            <ellipse cx="20" cy="38.5" rx="1.3" ry="0.9" fill="#c87833" fillOpacity="0.45" />

            {/* Smile */}
            <path
                d="M16.5 41.5 Q20 44.8 23.5 41.5"
                stroke="#b45309"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
            />

            {/* ── BEARD ── */}
            <path
                d="M11 43.5 Q11.5 48.5 20 49 Q28.5 48.5 29 43.5 Q24.5 46.2 20 46.2 Q15.5 46.2 11 43.5 Z"
                fill="#f0ede4"
            />
            {/* Beard texture lines */}
            <path
                d="M15 44.5 Q17.5 48 20 48.5"
                stroke="#d8d5ca"
                strokeWidth="0.85"
                strokeLinecap="round"
                fill="none"
            />
            <path
                d="M25 44.5 Q22.5 48 20 48.5"
                stroke="#d8d5ca"
                strokeWidth="0.85"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    );
}
