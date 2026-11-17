import { describe, expect, it } from 'vitest';
import { extractRating, looksLikeRatingNews } from '@/lib/ratings/extract';

describe('rating headlines', () => {
    it.each([
        ['Morgan Stanley upgrades Apple to Overweight from Equal-Weight', { broker: 'Morgan Stanley', action: 'upgrade', toRating: 'Overweight', fromRating: 'Equal-Weight' }],
        ['Bank of America downgrades Nike to Neutral', { broker: 'Bank of America', action: 'downgrade', toRating: 'Neutral' }],
        ['Intel downgraded to Sell at Goldman Sachs', { broker: 'Goldman Sachs', action: 'downgrade', toRating: 'Sell' }],
        ['Jefferies initiates Nvidia at Buy', { broker: 'Jefferies', action: 'initiation', toRating: 'Buy' }],
        ['Bernstein cuts PepsiCo to Underperform on North America pressure', { broker: 'Bernstein', action: 'downgrade', toRating: 'Underperform' }],
        ['UBS raises Tesla price target to $500', { broker: 'UBS', action: 'target_up', priceTarget: '$500' }],
        ["Goldman Sachs relève sa recommandation sur LVMH à l'achat", { broker: 'Goldman Sachs', action: 'upgrade', toRating: "l'achat" }],
    ])('%s', (headline, expected) => {
        expect(extractRating(headline)).toMatchObject({ ...expected, method: 'pattern' });
    });

    it('keeps a keyword-level reading when no pattern matches', () => {
        expect(extractRating('Analysts turn cautious as SAP gets downgraded amid cloud worries')).toMatchObject({
            broker: null, action: 'downgrade', method: 'keyword',
        });
    });

    it('ignores ordinary news', () => {
        expect(looksLikeRatingNews('Apple unveils new iPhone at September event')).toBe(false);
        expect(extractRating('TotalEnergies signs LNG deal with Qatar')).toBeNull();
    });
});
