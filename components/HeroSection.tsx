'use client';

import { BarChart3, Brain, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import AugurBadge from '@/components/AugurBadge';

const stats = [
    { icon: BarChart3, label: 'Real-Time Data',    desc: 'Live quotes & indices' },
    { icon: Brain,     label: 'AI Analysis',       desc: 'Claude-powered insights' },
    { icon: Shield,    label: 'Insider Tracking',  desc: 'Congress & executives' },
    { icon: Zap,       label: 'Smart Alerts',      desc: 'Analyst upgrades & news' },
];

const HeroSection = () => {
    return (
        <div className="relative overflow-hidden pt-28 pb-16 lg:pt-40 lg:pb-24">
            {/* Animated background orbs */}
            <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[10%] left-[15%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[100px] animate-pulse-slow" />
                <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] rounded-full bg-purple-500/10 blur-[100px] animate-pulse-slow" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-[0%] left-[40%] w-[500px] h-[300px] rounded-full bg-pink-500/8 blur-[100px] animate-pulse-slow" style={{ animationDelay: '4s' }} />
            </div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] z-0 pointer-events-none" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">

                    {/* ── Full Augur badge ── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="flex justify-center mb-10"
                    >
                        <div className="drop-shadow-[0_0_40px_rgba(34,211,238,0.2)]">
                            <AugurBadge size={200} />
                        </div>
                    </motion.div>

                    {/* ── Headline ── */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.25 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[0.95]"
                    >
                        <span className="text-white">See Beyond the</span>
                        <br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                            Market Noise
                        </span>
                    </motion.h1>

                    {/* ── Subtext ── */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.35 }}
                        className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed"
                    >
                        AI-powered market intelligence combining real-time data, insider activity,
                        and analyst insights — all in one dashboard.
                    </motion.p>
                </div>

                {/* ── Feature pills ── */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.45 }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
                >
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                            className="group relative bg-white/[0.03] backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-300 text-center"
                        >
                            <div className="inline-flex p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-white/[0.06] mb-3 group-hover:from-cyan-500/25 group-hover:to-purple-500/25 transition-all">
                                <stat.icon size={20} className="text-cyan-400" />
                            </div>
                            <div className="text-sm font-bold text-white mb-0.5">{stat.label}</div>
                            <div className="text-[11px] text-slate-500">{stat.desc}</div>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default HeroSection;
