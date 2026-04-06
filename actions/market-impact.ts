'use server';

import { getGeneralNews, getEconomicCalendar } from '@/lib/fmp';
import { analyzeMarketImpact, MarketImpactAnalysis } from '@/lib/claude';

export async function getMarketImpactAction(): Promise<MarketImpactAnalysis | null> {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch data sequentially to avoid FMP rate limiting
        const news = await getGeneralNews(15).catch(() => []);
        await new Promise(r => setTimeout(r, 250)); // small delay
        const calendar = await getEconomicCalendar(today, today).catch(() => []);

        // Analyze with Claude
        return await analyzeMarketImpact(news, calendar);
    } catch (error) {
        console.error('Market Impact Action Error:', error);
        return null; // Return null on error to handle gracefully in UI
    }
}
