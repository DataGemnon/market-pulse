'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, ChevronDown, Sun } from 'lucide-react';
import { useMorningBriefPreference } from '@/hooks/useMorningBriefPreference';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { signOut } from '@/actions/auth';
import AuthModal from '@/components/AuthModal';
import AugurLogo from '@/components/AugurLogo';
import type { User as SupabaseUser } from '@supabase/supabase-js';

const Navbar = () => {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const supabase = createClient();

        // Get initial session
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) setShowAuthModal(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Close user menu on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowUserMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSignOut = async () => {
        setSigningOut(true);
        setShowUserMenu(false);
        await signOut();
        setSigningOut(false);
    };

    const { enabled: briefEnabled, toggle: toggleBrief } = useMorningBriefPreference();

    const initials = user?.email
        ? user.email.slice(0, 2).toUpperCase()
        : '??';

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0f]/70 backdrop-blur-2xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        {/* Logo */}
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center gap-2.5 group">
                                <div className="group-hover:scale-105 group-hover:drop-shadow-[0_0_14px_rgba(34,211,238,0.5)] transition-all duration-300">
                                    <AugurLogo size={34} />
                                </div>
                                <span className="font-black text-xl tracking-[0.2em] uppercase bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                                    AUGUR
                                </span>
                            </Link>
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-3">
                            {/* Live indicator */}
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                                </span>
                                Live
                            </div>

                            {/* Morning Brief toggle */}
                            <button
                                onClick={toggleBrief}
                                title={briefEnabled ? 'Turn off Morning Brief' : 'Turn on Morning Brief'}
                                className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-all duration-200 ${
                                    briefEnabled
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15'
                                        : 'bg-white/[0.03] border-white/[0.08] text-slate-600 hover:text-slate-400 hover:bg-white/[0.05]'
                                }`}
                            >
                                <Sun size={12} className={briefEnabled ? 'text-amber-400' : 'text-slate-600'} />
                                <span>Brief</span>
                                {/* Toggle pill */}
                                <div className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${briefEnabled ? 'bg-amber-500/40' : 'bg-white/10'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200 ${briefEnabled ? 'left-3.5 bg-amber-400' : 'left-0.5 bg-slate-600'}`} />
                                </div>
                            </button>

                            {/* Auth area */}
                            {user ? (
                                /* User avatar + dropdown */
                                <div className="relative" ref={menuRef}>
                                    <button
                                        onClick={() => setShowUserMenu(v => !v)}
                                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all"
                                    >
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-[11px] font-bold text-white">
                                            {initials}
                                        </div>
                                        <span className="hidden sm:block text-xs text-slate-400 max-w-[120px] truncate">
                                            {user.email}
                                        </span>
                                        <ChevronDown size={12} className={`text-slate-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                                    </button>

                                    {/* Dropdown */}
                                    {showUserMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-52 bg-[#0f0f17] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/60 overflow-hidden z-50">
                                            <div className="px-4 py-3 border-b border-white/[0.06]">
                                                <p className="text-xs text-slate-500">Signed in as</p>
                                                <p className="text-sm text-white font-medium truncate">{user.email}</p>
                                            </div>
                                            <div className="p-1">
                                                <button
                                                    onClick={handleSignOut}
                                                    disabled={signingOut}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/[0.08] hover:text-red-300 transition-colors disabled:opacity-50"
                                                >
                                                    <LogOut size={14} />
                                                    {signingOut ? 'Signing out…' : 'Sign out'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Sign in button */
                                <button
                                    onClick={() => setShowAuthModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-cyan-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <LogIn size={14} />
                                    <span className="hidden sm:block">Sign in</span>
                                    <span className="sm:hidden">
                                        <LogIn size={14} />
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Auth modal */}
            {showAuthModal && (
                <AuthModal
                    onClose={() => setShowAuthModal(false)}
                    onSuccess={() => setShowAuthModal(false)}
                />
            )}
        </>
    );
};

export default Navbar;
