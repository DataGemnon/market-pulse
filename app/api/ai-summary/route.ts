import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const { news } = await req.json();

        if (!news || !Array.isArray(news) || news.length === 0) {
            return NextResponse.json({ summary: ["No significant news to report."] });
        }

        // Prepare content for Claude
        const newsText = news.slice(0, 15).map((n: any) => `- ${n.title} (${n.symbol})`).join('\n');

        const prompt = `
You are a senior financial analyst. 
Review the following recent market news headlines affecting a user's portfolio:

${newsText}

Identify the 3 most critical drivers of market movement today.
Summarize them into 3 distinct, actionable bullet points.
Focus on "Why is it moving?". 
Keep each point under 20 words.
Do not use introductory text like "Here are the points". Just the bullets.
    `;

        const msg = await anthropic.messages.create({
            model: "claude-haiku-4-5",
            max_tokens: 150,
            temperature: 0.5,
            messages: [
                { role: "user", content: prompt }
            ]
        });

        const content = msg.content[0].type === 'text' ? msg.content[0].text : '';

        // Parse bullets (assuming Claude returns "- Point 1\n- Point 2")
        const bulletPoints = content.split('\n')
            .map(line => line.trim().replace(/^[-•*]\s*/, ''))
            .filter(line => line.length > 5)
            .slice(0, 3);

        return NextResponse.json({ summary: bulletPoints });

    } catch (error) {
        console.error('AI Summary Error:', error);
        return NextResponse.json({ error: 'Failed to generate summary' }, { status: 500 });
    }
}
