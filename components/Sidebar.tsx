'use client';

import { useEffect, useState } from 'react';
import {
    LayoutDashboard, TrendingUp, Globe, BarChart2,
    Users, Zap, MessageSquare,
} from 'lucide-react';

const NAV = [
    { id: 'dashboard',    label: 'Dashboard',      icon: LayoutDashboard },
    { id: 'markets',      label: 'Live Markets',    icon: TrendingUp       },
    { id: 'international',label: 'Global Markets',  icon: Globe            },
    { id: 'sectors',      label: 'Sector Heatmap',  icon: BarChart2        },
    { id: 'analyst',      label: 'Analyst Picks',   icon: Users            },
    { id: 'impact',       label: 'Market Impact',   icon: Zap              },
    { id: 'voices',       label: 'Market Voices',   icon: MessageSquare    },
];

export default function Sidebar() {
    const [activeId, setActiveId] = useState('dashboard');

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                // Pick the entry closest to the top of the viewport
                const visible = entries
                    .filter(e => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
                if (visible.length > 0) setActiveId(visible[0].target.id);
            },
            { rootMargin: '-10% 0px -55% 0px', threshold: 0 }
        );

        NAV.forEach(({ id }) => {
            const el = document.getElementById(id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    const scrollTo = (id: string) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-52 hidden xl:flex flex-col z-40 border-r border-white/[0.05] bg-[#0a0a0f]/80 backdrop-blur-xl">
            <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-0.5">
                {NAV.map(({ id, label, icon: Icon }) => {
                    const active = activeId === id;
                    return (
                        <button
                            key={id}
                            onClick={() => scrollTo(id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 text-left group ${
                                active
                                    ? 'bg-white/[0.06] text-white'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                            }`}
                        >
                            <Icon
                                size={15}
                                className={`flex-shrink-0 transition-colors ${active ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400'}`}
                            />
                            <span className="truncate">{label}</span>
                            {active && (
                                <span className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-400" />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom branding */}
            <div className="px-5 py-4 border-t border-white/[0.05]">
                <p className="text-[10px] text-slate-700 uppercase tracking-widest">augur</p>
                <p className="text-[10px] text-slate-700 mt-0.5">Market Intelligence</p>
            </div>
        </aside>
    );
}
