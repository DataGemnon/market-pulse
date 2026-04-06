'use client';

import { NewsArticle } from '@/types';
import { ExternalLink, Clock } from 'lucide-react';

interface NewsFeedProps {
    news: NewsArticle[];
}

const NewsFeed = ({ news }: NewsFeedProps) => {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Market News</h3>
                <button className="text-sm text-cyan-400 font-semibold hover:text-cyan-300 transition-colors">View All</button>
            </div>

            <div className="grid gap-4">
                {news.map((article, index) => (
                    <a
                        key={index}
                        href={article.url}
                        className="group flex flex-col md:flex-row gap-4 p-4 bg-white/[0.03] rounded-xl border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.05] transition-all duration-300"
                    >
                        <div className="relative w-full md:w-44 h-28 flex-shrink-0 overflow-hidden rounded-lg bg-white/[0.05]">
                            <img
                                src={article.image}
                                alt={article.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        <div className="flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-[11px] font-bold text-cyan-400 px-2 py-0.5 bg-cyan-500/10 rounded-md border border-cyan-500/20">{article.symbol}</span>
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                        <Clock size={11} />
                                        {new Date(article.publishedDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <h4 className="font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2 mb-2 text-sm">
                                    {article.title}
                                </h4>
                                <p className="text-sm text-slate-500 line-clamp-2">
                                    {article.text}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-3 text-[11px] text-slate-600 font-medium">
                                <img
                                    src={`https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${article.site.toLowerCase().replace(/\s/g, '')}.com&size=16`}
                                    alt=""
                                    className="w-4 h-4 rounded-full"
                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                                {article.site}
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );
};

export default NewsFeed;
