'use client';

import { Bell, Clock } from 'lucide-react';
import { NewsArticle } from '@/types';

interface AlertsPanelProps {
    missedNews?: NewsArticle[];
}

const AlertsPanel = ({ missedNews = [] }: AlertsPanelProps) => {
    return (
        <div className="space-y-6">
            {missedNews.length > 0 ? (
                <div className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={18} className="text-orange-400" />
                        <h3 className="font-bold text-white">Missed News</h3>
                    </div>
                    <div className="space-y-3">
                        {missedNews.map((article, idx) => (
                            <a key={idx} href={article.url} className="block group">
                                <div className="flex gap-3 p-3 rounded-xl hover:bg-white/[0.02] transition-colors">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-bold text-cyan-400">{article.symbol}</span>
                                            <span className="text-[11px] text-slate-600 truncate">{article.site}</span>
                                        </div>
                                        <h4 className="text-sm font-medium text-slate-300 leading-snug group-hover:text-cyan-400 transition-colors line-clamp-2">
                                            {article.title}
                                        </h4>
                                        <div className="mt-1 text-[11px] text-slate-600">
                                            {new Date(article.publishedDate).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/[0.06] text-center py-10">
                    <Bell size={24} className="mx-auto text-slate-600 mb-2" />
                    <h3 className="text-sm font-medium text-slate-400">No new alerts</h3>
                    <p className="text-xs text-slate-600 mt-1">You're all caught up on market news.</p>
                </div>
            )}
        </div>
    );
};

export default AlertsPanel;
