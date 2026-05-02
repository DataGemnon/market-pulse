'use client';

import { useState, useRef } from 'react';
import { Search, Plus, Check, Loader2, Sparkles, X, ArrowRight } from 'lucide-react';

export interface DiscoveryResult {
    symbol: string;
    name: string;
    what: string;
    fit: string;
}

async function discoverStocks(query: string): Promise<DiscoveryResult[]> {
    const res = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

interface StockDiscoveryProps {
    watchlist: string[];
    onAddSymbol: (symbol: string) => void;
}

const SUGGESTIONS = ['electric cars', 'artificial intelligence', 'luxury brands', 'clean energy', 'cybersecurity'];

export default function StockDiscovery({ watchlist, onAddSymbol }: StockDiscoveryProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<DiscoveryResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSearch = async (q?: string) => {
        const term = (q ?? query).trim();
        if (!term || loading) return;
        setLoading(true);
        setError('');
        setResults([]);
        setSearched(term);
        if (q) setQuery(q);
        try {
            const data = await discoverStocks(term);
            if (data.length === 0) {
                setError("Couldn't find matching companies. Try something like \"electric cars\" or \"AI software\".");
            } else {
                setResults(data);
            }
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        setQuery('');
        setResults([]);
        setSearched('');
        setError('');
        inputRef.current?.focus();
    };

    const hasOutput = loading || results.length > 0 || !!error;

    return (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden transition-all duration-300 hover:border-white/[0.09]">
            {/* ── Header ── */}
            <div className="px-5 pt-5 pb-4">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-white/[0.06]">
                        <Sparkles size={14} className="text-cyan-400" />
                    </div>
                    <h3 className="font-bold text-white">Discover Investments</h3>
                    <span className="text-[10px] text-slate-600 uppercase tracking-widest ml-auto">AI-powered</span>
                </div>

                {/* ── Search bar ── */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder='What do you want to invest in?'
                            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/30 focus:bg-white/[0.06] transition-all"
                        />
                    </div>
                    <button
                        onClick={() => handleSearch()}
                        disabled={!query.trim() || loading}
                        className="px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/20 text-cyan-400 hover:from-cyan-500/30 hover:to-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center"
                    >
                        {loading
                            ? <Loader2 size={15} className="animate-spin" />
                            : <ArrowRight size={15} />
                        }
                    </button>
                </div>

                {/* ── Suggestion chips (only when idle) ── */}
                {!hasOutput && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => handleSearch(s)}
                                className="text-[11px] px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.07] hover:border-white/[0.1] transition-all"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Results area ── */}
            {hasOutput && (
                <div className="border-t border-white/[0.04] px-5 pb-5">
                    {/* Results header */}
                    {searched && !loading && results.length > 0 && (
                        <div className="flex items-center justify-between py-3">
                            <span className="text-xs text-slate-500">
                                {results.length} companies matching{' '}
                                <span className="text-slate-300 font-medium">"{searched}"</span>
                            </span>
                            <button
                                onClick={handleClear}
                                className="text-slate-600 hover:text-slate-400 transition-colors p-0.5"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Loading skeletons */}
                    {loading && (
                        <div className="pt-3 space-y-2">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="p-3 rounded-xl bg-white/[0.02] animate-pulse">
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-12 bg-white/[0.07] rounded" />
                                            <div className="h-3 w-24 bg-white/[0.04] rounded" />
                                        </div>
                                        <div className="h-6 w-14 bg-white/[0.04] rounded-lg flex-shrink-0" />
                                    </div>
                                    <div className="h-2.5 w-3/4 bg-white/[0.04] rounded mb-1.5" />
                                    <div className="h-2.5 w-1/2 bg-white/[0.03] rounded" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div className="pt-3 flex items-center justify-between">
                            <p className="text-sm text-slate-500">{error}</p>
                            <button onClick={handleClear} className="text-slate-600 hover:text-slate-400 transition-colors ml-3 flex-shrink-0">
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    {/* Stock cards */}
                    {!loading && results.length > 0 && (
                        <div className="space-y-2">
                            {results.map(r => {
                                const inWatchlist = watchlist.includes(r.symbol);
                                return (
                                    <div
                                        key={r.symbol}
                                        className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] hover:border-white/[0.07] transition-all duration-200"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-white text-sm">{r.symbol}</span>
                                                    <span className="text-xs text-slate-500 truncate">{r.name}</span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                                    {r.what}
                                                </p>
                                                <p className="text-[11px] text-cyan-500/60 leading-relaxed mt-0.5 italic">
                                                    {r.fit}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => { if (!inWatchlist) onAddSymbol(r.symbol); }}
                                                disabled={inWatchlist}
                                                className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                    inWatchlist
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                                                        : 'bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 hover:text-cyan-400'
                                                }`}
                                            >
                                                {inWatchlist
                                                    ? <><Check size={11} /> Added</>
                                                    : <><Plus size={11} /> Add</>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
