'use server';

import Anthropic from '@anthropic-ai/sdk';
import { UpcomingEarnings, EarningsPreviewResult } from '@/types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function dayOffset(dateStr: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

async function buildPreview(e: UpcomingEarnings, when: string): Promise<string> {
    const timing =
        e.time === 'bmo' ? ' before market open' :
        e.time === 'amc' ? ' after market close' : '';

    const parts: string[] = [];
    if (e.epsEstimated !== null) parts.push(`EPS estimate: $${e.epsEstimated.toFixed(2)}`);
    if (e.revenueEstimated !== null) parts.push(`revenue estimate: $${(e.revenueEstimated / 1e9).toFixed(1)}B`);
    const estimates = parts.length ? ` Analysts expect ${parts.join(' and ')}.` : '';

    const prompt =
        `${e.name} (${e.symbol}) reports earnings ${when}${timing}.${estimates}\n` +
        `Write ONE plain-English sentence (max 20 words) that a beginner investor should know before this report. ` +
        `No jargon, no buy/sell advice.`;

    const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 80,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
    });

    return (msg.content[0] as { type: 'text'; text: string }).text.trim();
}

export async function getEarningsPreviews(
    earnings: UpcomingEarnings[]
): Promise<EarningsPreviewResult[]> {
    // Only care about today and tomorrow
    const upcoming = earnings.filter(e => {
        const offset = dayOffset(e.date);
        return offset === 0 || offset === 1;
    });

    if (upcoming.length === 0) return [];

    const results = await Promise.all(
        upcoming.map(async (e) => {
            try {
                const offset = dayOffset(e.date);
                const when = offset === 0 ? 'today' : 'tomorrow';
                const preview = await buildPreview(e, when);
                return { symbol: e.symbol, name: e.name, date: e.date, time: e.time, preview };
            } catch {
                return null;
            }
        })
    );

    return results.filter((r): r is EarningsPreviewResult => r !== null);
}
