import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getMarketIndices, getGeneralNews, getSectorPerformance } from '@/lib/fmp';

export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
    if (new Date().getDay() === 0) return NextResponse.json({ brief: null, sunday: true });

    const { watchlist } = await req.json();

    const [indices, news, sectors] = await Promise.all([
        getMarketIndices().catch(() => []),
        getGeneralNews(10).catch(() => []),
        getSectorPerformance().catch(() => []),
    ]);

    const indicesText = indices
        .map(i => `${i.name}: ${i.changesPercentage >= 0 ? '+' : ''}${i.changesPercentage.toFixed(2)}%`)
        .join(', ') || 'unavailable';

    const topSectors = [...sectors]
        .sort((a, b) => Math.abs(b.changesPercentage) - Math.abs(a.changesPercentage))
        .slice(0, 3)
        .map(s => `${s.sector}: ${s.changesPercentage >= 0 ? '+' : ''}${s.changesPercentage.toFixed(2)}%`)
        .join(', ') || 'unavailable';

    const headlines = news.slice(0, 8).map(n => `- ${n.title}`).join('\n') || 'No headlines';
    const watchlistText = Array.isArray(watchlist) && watchlist.length > 0 ? watchlist.join(', ') : 'none';

    const prompt = `Brief a beginner investor on what's happening in markets right now.

Market indices: ${indicesText}
Top moving sectors: ${topSectors}
User's watchlist: ${watchlistText}
Headlines:
${headlines}

Write exactly 3 short sentences in plain, friendly English:
1. Overall market mood (up, down, mixed — and why in simple terms)
2. The most important story or theme driving markets today
3. One specific thing worth watching today

Rules: no jargon, no buy/sell advice, max 20 words per sentence, confident friendly tone, return only the 3 sentences.`;

    try {
        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 200,
            temperature: 0.3,
            messages: [{ role: 'user', content: prompt }],
        });
        const text = msg.content[0].type === 'text' ? msg.content[0].text.trim() : null;
        return NextResponse.json({ brief: text });
    } catch (err) {
        console.error('morning-brief route error:', err);
        return NextResponse.json({ brief: null, error: String(err) });
    }
}
