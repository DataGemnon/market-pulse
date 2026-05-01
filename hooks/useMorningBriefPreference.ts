'use client';

import { useState, useEffect, useCallback } from 'react';

const LS_KEY    = 'augur-morning-brief-enabled';
const SYNC_EVT  = 'augur:brief-toggle';

export function useMorningBriefPreference() {
    const [enabled, setEnabled] = useState(true); // default on

    useEffect(() => {
        // Read persisted preference
        try {
            const stored = localStorage.getItem(LS_KEY);
            if (stored !== null) setEnabled(stored === 'true');
        } catch { /* SSR / privacy mode */ }

        // Sync when another component flips the toggle
        const handler = (e: Event) => {
            setEnabled((e as CustomEvent<boolean>).detail);
        };
        window.addEventListener(SYNC_EVT, handler);
        return () => window.removeEventListener(SYNC_EVT, handler);
    }, []);

    const toggle = useCallback(() => {
        setEnabled(prev => {
            const next = !prev;
            try {
                localStorage.setItem(LS_KEY, String(next));
                window.dispatchEvent(new CustomEvent<boolean>(SYNC_EVT, { detail: next }));
            } catch { /* ignore */ }
            return next;
        });
    }, []);

    return { enabled, toggle };
}
