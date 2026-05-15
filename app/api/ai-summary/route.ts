import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const { news } = await req.json();
        if (!news || !Array.isArray(news) || news.length === 0) {
            return NextResponse.json({ summary: ['No significant news to report.'] });
        }

        // Pass title + article text (not just the headline)
        const newsText = news.slice(0, 15).map((n: any, i: number) =>
            `[${i + 1}] ${n.title}\n${(n.text || '').replace(/<[^>]+>/g, '').trim().slice(0, 300)}`
        ).join('\n\n');

        const prompt = `Read these news articles and identify the 3 most important things moving markets for a user's watchlist today.

${newsText}

Write exactly 3 bullet points. Each must:
- Name a SPECIFIC event, person, or data release (not an abstract concept)
- Be written in plain English for someone who doesn't follow markets
- Be under 20 words
- Explain the cause AND the effect in one sentence

✅ Good: "Trump's trade visit to China ended without a deal, keeping tariff fears alive"
✅ Good: "Inflation came in higher than forecast, making interest rate cuts less likely this year"
✅ Good: "Fed Chair Powell said rates will stay high until prices fall further"
❌ Bad: "Market breadth concerns amid mixed equity performance"
❌ Bad: "Rotation away from mega-cap concentration"
❌ Bad: "Risk-off sentiment persists across asset classes"

No ETF ticker names (say "Nasdaq" not "QQQ", "bond market" not "TLT").
Return only the 3 bullet points, no intro, no numbering — just the text of each point on its own line.`;

        const msg = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 256,
            temperature: 0.2,
            messages: [{ role: 'user', content: prompt }],
        });

        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';
        const bulletPoints = content
            .split('\n')
            .map(line => line.trim().replace(/^[-•*\d.]\s*/, ''))
            .filter(line => line.length > 10)
            .slice(0, 3);

        return NextResponse.json({ summary: bulletPoints });
    } catch (error) {
        console.error('AI Summary Error:', error);
        return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }
}
