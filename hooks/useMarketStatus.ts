'use client';

import { useState, useEffect } from 'react';

function checkMarketOpen(): boolean {
    try {
        const now = new Date();

        // Use Intl to get current time in New York — handles DST automatically
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            weekday: 'short',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
        }).formatToParts(now);

        const get = (type: string) => parts.find(p => p.type === type)?.value ?? '';

        const weekday = get('weekday');          // 'Mon', 'Tue', …, 'Sat', 'Sun'
        const hour    = parseInt(get('hour'));    // 0-23
        const minute  = parseInt(get('minute')); // 0-59

        // Weekends: closed
        if (weekday === 'Sat' || weekday === 'Sun') return false;

        // Regular session: 9:30 AM – 4:00 PM ET
        const totalMinutes  = hour * 60 + minute;
        const marketOpen    = 9 * 60 + 30;   // 570
        const marketClose   = 16 * 60;        // 960

        return totalMinutes >= marketOpen && totalMinutes < marketClose;
    } catch {
        return false;
    }
}

export function useMarketStatus() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        setIsOpen(checkMarketOpen());

        // Re-evaluate every 30 seconds to catch open/close transitions promptly
        const id = setInterval(() => setIsOpen(checkMarketOpen()), 30_000);
        return () => clearInterval(id);
    }, []);

    return { isOpen };
}
