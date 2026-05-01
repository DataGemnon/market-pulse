'use client';

import { useState, useRef } from 'react';
import { HelpCircle } from 'lucide-react';

const DEFINITIONS: Record<string, string> = {
    'Price':         'The current market price of one share.',
    'Change':        'How much the price moved today. Green = up, red = down.',
    'P&L':           'Profit & Loss — the difference between what you paid and what your shares are worth right now.',
    'P/E':           'Price-to-Earnings — how much investors pay per dollar of profit. High P/E can mean high growth expectations.',
    'EPS':           'Earnings Per Share — the company\'s profit divided by the number of shares. Higher is generally better.',
    'Volume':        'Number of shares traded today. A spike usually means big news or strong investor interest.',
    'Market Cap':    'Total value of all shares combined. Tells you how "big" the company is.',
    '52W High':      'The highest price this stock reached over the past 52 weeks.',
    '52W Low':       'The lowest price this stock reached over the past 52 weeks.',
    'Analyst Score': 'A 0–100 score based on how many analysts say Buy vs. Sell. Above 65 = bullish, below 40 = bearish.',
    'BMO':           'Before Market Open — the earnings report comes out before the stock market opens that morning.',
    'AMC':           'After Market Close — the earnings report comes out after the market closes for the day.',
};

interface MetricTooltipProps {
    term: string;
    size?: number;
}

export default function MetricTooltip({ term, size = 11 }: MetricTooltipProps) {
    const [visible, setVisible] = useState(false);
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const definition = DEFINITIONS[term];
    if (!definition) return null;

    const show = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        setVisible(true);
    };

    const hide = () => {
        hideTimer.current = setTimeout(() => setVisible(false), 120);
    };

    return (
        <span
            className="relative inline-flex items-center ml-1 align-middle"
            onMouseEnter={show}
            onMouseLeave={hide}
        >
            <HelpCircle
                size={size}
                className="text-slate-700 hover:text-slate-400 cursor-help transition-colors"
            />
            {visible && (
                <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5 z-50 w-52 bg-[#12121e] border border-white/[0.1] rounded-xl shadow-2xl shadow-black/60 p-3 pointer-events-none"
                    style={{ minWidth: '200px' }}
                >
                    <p className="text-[11px] font-bold text-white mb-1">{term}</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{definition}</p>
                    {/* Caret */}
                    <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 block w-3 h-3 rotate-45 bg-[#12121e] border-r border-b border-white/[0.1]" />
                </div>
            )}
        </span>
    );
}
