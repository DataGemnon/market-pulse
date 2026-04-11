'use server';

import { getAnalystConsensus, getRecentUpgradesDowngrades, getDiscoveryStocks } from '@/lib/fmp';
import { UpgradeDowngrade } from '@/types';

interface ConsensusWithShift {
    symbol: string;
    date: string;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    buyShift: number;
    totalAnalysts: number;
    bullPercent: number;
}

export async function getAnalystConsensusAction(): Promise<ConsensusWithShift[]> {
    const symbols = getDiscoveryStocks().slice(0, 15);
    const results: ConsensusWithShift[] = [];

    for (const sym of symbols) {
        try {
            const data = await getAnalystConsensus(sym);
            if (data.length >= 2) {
                const current = data[0];
                const previous = data[1];

                const currentBulls = current.strongBuy + current.buy;
                const previousBulls = previous.strongBuy + previous.buy;
                const totalAnalysts = current.strongBuy + current.buy + current.hold + current.sell + current.strongSell;

                if (totalAnalysts === 0) continue;

                results.push({
                    ...current,
                    buyShift: currentBulls - previousBulls,
                    totalAnalysts,
                    bullPercent: Math.round((currentBulls / totalAnalysts) * 100),
                });
            } else if (data.length === 1) {
                const current = data[0];
                const totalAnalysts = current.strongBuy + current.buy + current.hold + current.sell + current.strongSell;
                if (totalAnalysts === 0) continue;
                const currentBulls = current.strongBuy + current.buy;

                results.push({
                    ...current,
                    buyShift: 0,
                    totalAnalysts,
                    bullPercent: Math.round((currentBulls / totalAnalysts) * 100),
                });
            }
        } catch {
            // skip symbol
        }
        await new Promise(r => setTimeout(r, 100));
    }

    // Sort: biggest movers first (by absolute shift), then by bull percent
    return results.sort((a, b) => {
        if (Math.abs(b.buyShift) !== Math.abs(a.buyShift)) {
            return Math.abs(b.buyShift) - Math.abs(a.buyShift);
        }
        return b.bullPercent - a.bullPercent;
    });
}

export async function getRecentUpgradesDowngradesAction(): Promise<UpgradeDowngrade[]> {
    return getRecentUpgradesDowngrades();
}
