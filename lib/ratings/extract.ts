/**
 * Recognising broker rating changes in news headlines (English, French,
 * German). Pure functions; Claude only handles what the patterns miss.
 */

export type RatingAction = 'upgrade' | 'downgrade' | 'initiation' | 'target_up' | 'target_down' | 'reiteration' | 'unknown';

export type ExtractedRating = {
    broker: string | null;
    action: RatingAction;
    fromRating: string | null;
    toRating: string | null;
    priceTarget: string | null;
    method: 'pattern' | 'ai' | 'keyword';
};

const RATING_WORDS = /\b(upgrade[sd]?|downgrade[sd]?|initiat\w*|reiterat\w*|price target|target price|overweight|underweight|equal[- ]weight|outperform|underperform|market perform|sector perform|buy rating|sell rating|hold rating|neutral rating|relève|rehausse|abaisse|dégrade|objectif de cours|recommandation|à l'achat|à la vente|à conserver|hochgestuft|abgestuft|kursziel|kaufempfehlung)\b/i;

export function looksLikeRatingNews(headline: string): boolean {
    return RATING_WORDS.test(headline);
}

const BROKER = String.raw`([A-Z][\w&.'-]*(?:\s+(?:[A-Z][\w&.'-]*|&|de|of))*?)`;
// Patterns are case-insensitive, so connecting words must be excluded explicitly
const STOP = String.raw`(?!(?:from|at|by|on|after|as|with|amid|in)\b)`;
const RATING = String.raw`(${STOP}[A-Z][\w-]*(?:\s+${STOP}[A-Z][\w-]*)?)`;

const PATTERNS: { re: RegExp; action: (m: RegExpMatchArray) => RatingAction; broker: number; from?: number; to?: number; target?: number }[] = [
    // "Morgan Stanley upgrades Apple to Overweight from Equal-Weight"
    {
        re: new RegExp(String.raw`^${BROKER}\s+(upgrades|downgrades)\s+.+?\s+to\s+${RATING}(?:\s+from\s+${RATING})?`, 'i'),
        action: m => (/^up/i.test(m[2]) ? 'upgrade' : 'downgrade'), broker: 1, to: 3, from: 4,
    },
    // "Apple upgraded to Buy at Goldman Sachs" / "... by Goldman Sachs"
    {
        re: new RegExp(String.raw`(upgraded|downgraded)\s+to\s+${RATING}\s+(?:at|by)\s+${BROKER}(?:[;,:(]|\s+on\b|\s+as\b|\s+after\b|$)`, 'i'),
        action: m => (/^up/i.test(m[1]) ? 'upgrade' : 'downgrade'), broker: 3, to: 2,
    },
    // "Jefferies initiates Nvidia at Buy" / "initiates coverage of X with Buy"
    {
        re: new RegExp(String.raw`^${BROKER}\s+initiates\s+(?:coverage\s+(?:of|on)\s+)?.+?\s+(?:at|with(?:\s+an?)?)\s+${RATING}`, 'i'),
        action: () => 'initiation', broker: 1, to: 2,
    },
    // "UBS raises Tesla price target to $500"
    {
        re: new RegExp(String.raw`^${BROKER}\s+(raises|lifts|boosts|cuts|lowers|trims)\s+.+?(?:price\s+)?target\s+to\s+([$€£]?\s?[\d.,]+\s?(?:€|\$|euros?|dollars?)?)`, 'i'),
        action: m => (/^(raises|lifts|boosts)/i.test(m[2]) ? 'target_up' : 'target_down'), broker: 1, target: 3,
    },
    // "Bernstein cuts PepsiCo to Underperform" / "HSBC raises Airbus to Buy from Hold"
    {
        re: new RegExp(String.raw`^${BROKER}\s+(cuts|lowers|raises|lifts|boosts)\s+.+?\s+to\s+${RATING}(?:\s+from\s+${RATING})?(?:\s|$|[;,:])`, 'i'),
        action: m => (/^(raises|lifts|boosts)/i.test(m[2]) ? 'upgrade' : 'downgrade'), broker: 1, to: 3, from: 4,
    },
    // "Goldman Sachs relève sa recommandation sur LVMH à l'achat" / "abaisse ... à neutre"
    {
        re: new RegExp(String.raw`^${BROKER}\s+(relève|rehausse|abaisse|dégrade)\s+.*?(?:à|en)\s+(l'achat|achat|neutre|conserver|vendre|la vente|surpondérer|sous-pondérer)`, 'i'),
        action: m => (/^(relève|rehausse)/i.test(m[2]) ? 'upgrade' : 'downgrade'), broker: 1, to: 3,
    },
];

const KEYWORD_ACTIONS: [RegExp, RatingAction][] = [
    [/\b(upgrade[sd]?|relève|rehausse|hochgestuft)\b/i, 'upgrade'],
    [/\b(downgrade[sd]?|abaisse|dégrade|abgestuft)\b/i, 'downgrade'],
    [/\binitiat/i, 'initiation'],
    [/\b(raises?|lifts?|boosts?)\b.*\btarget/i, 'target_up'],
    [/\b(cuts?|lowers?|trims?)\b.*\btarget/i, 'target_down'],
    [/\breiterat/i, 'reiteration'],
];

const clean = (value: string | undefined) => (value ? value.replace(/\s+/g, ' ').trim() : null);

/** Pattern extraction; falls back to a keyword-only action without broker. */
export function extractRating(headline: string): ExtractedRating | null {
    if (!looksLikeRatingNews(headline)) return null;
    for (const pattern of PATTERNS) {
        const m = headline.match(pattern.re);
        if (!m) continue;
        return {
            broker: clean(m[pattern.broker]),
            action: pattern.action(m),
            fromRating: pattern.from ? clean(m[pattern.from]) : null,
            toRating: pattern.to ? clean(m[pattern.to]) : null,
            priceTarget: pattern.target ? clean(m[pattern.target]) : null,
            method: 'pattern',
        };
    }
    const action = KEYWORD_ACTIONS.find(([re]) => re.test(headline))?.[1] ?? 'unknown';
    return { broker: null, action, fromRating: null, toRating: null, priceTarget: null, method: 'keyword' };
}

export const ACTION_LABELS: Record<RatingAction, string> = {
    upgrade: 'Relèvement de recommandation',
    downgrade: 'Abaissement de recommandation',
    initiation: 'Début de couverture',
    target_up: "Hausse de l'objectif de cours",
    target_down: "Baisse de l'objectif de cours",
    reiteration: 'Recommandation confirmée',
    unknown: 'Changement de recommandation',
};
