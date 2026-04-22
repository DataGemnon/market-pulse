'use client';

import { useState } from 'react';
import { X, Mail, Lock, Loader2, Activity, CheckCircle2, AlertCircle } from 'lucide-react';
import { signIn, signUp } from '@/actions/auth';

interface AuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

type Mode = 'signin' | 'signup';

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<Mode>('signin');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setLoading(true);

        try {
            if (mode === 'signup') {
                const result = await signUp(email, password);
                if (result.error) {
                    setError(result.error);
                } else {
                    setSuccessMsg(result.message || 'Check your email to confirm your account.');
                }
            } else {
                const result = await signIn(email, password);
                if (result.error) {
                    setError(result.error);
                } else {
                    onSuccess();
                }
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#0f0f17] border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 text-white">
                            <Activity size={16} />
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg">
                                {mode === 'signin' ? 'Welcome back' : 'Create account'}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {mode === 'signin'
                                    ? 'Sign in to sync your watchlist across devices'
                                    : 'Save your watchlist & alerts forever'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/[0.05] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Email */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Email
                        </label>
                        <div className="relative">
                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder="you@example.com"
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Password
                        </label>
                        <div className="relative">
                            <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                                placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                                minLength={6}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white/[0.06] transition-all"
                            />
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/[0.08] border border-red-500/20">
                            <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Success */}
                    {successMsg && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20">
                            <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-emerald-400">{successMsg}</p>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-900/20"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={14} className="animate-spin" />
                                {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
                            </>
                        ) : (
                            mode === 'signin' ? 'Sign in' : 'Create account'
                        )}
                    </button>

                    {/* Mode toggle */}
                    <p className="text-center text-xs text-slate-500">
                        {mode === 'signin' ? (
                            <>
                                Don&apos;t have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
                                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                                >
                                    Sign up free
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{' '}
                                <button
                                    type="button"
                                    onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
                                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>
                </form>

                {/* Footer note */}
                <div className="px-6 pb-5 text-center">
                    <p className="text-[11px] text-slate-600">
                        Your data is stored securely. No payment required.
                    </p>
                </div>
            </div>
        </div>
    );
}
