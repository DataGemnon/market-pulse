'use client';

import Link from 'next/link';
import { Activity } from 'lucide-react';

const Navbar = () => {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/70 backdrop-blur-2xl border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 text-white shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 group-hover:scale-105 transition-all duration-300">
                                <Activity size={22} />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl -z-10" />
                            </div>
                            <span className="font-black text-xl tracking-tight">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                                    Market
                                </span>
                                <span className="text-white">Pulse</span>
                            </span>
                        </Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
