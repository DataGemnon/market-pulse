import type Anthropic from '@anthropic-ai/sdk';
import type { AssetFlag, Shock } from './detect';

/**
 * Turning a detected shock into an explanation: Claude searches the web for
 * the cause, and a deterministic reading of the cross-asset pattern is always
 * available, even without AI.
 */

export type ShockSource = { title: string; url: string };

export type ShockExplanation = {
    status: 'ok' | 'ai_unavailable' | 'error';
    cause: string;
    confidence: 'confirmée' | 'probable' | 'incertaine';
    lesson: string; // why this kind of event moves these assets
    channels: { segment: string; effect: string }[];
    sources: ShockSource[];
    pattern: string;
    generatedAt: string;
};

const parisTime = (t: number) =>
    new Date(t * 1000).toLocaleString('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'long', timeStyle: 'short' });

const signed = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(2).replace('.', ',')} %`;

function moveOf(assets: AssetFlag[], symbol: string): number | null {
    return assets.find(asset => asset.symbol === symbol)?.movePct ?? null;
}

/** Reads the cross-asset signature of a shock, the way a desk would at first glance. */
export function describePattern(assets: AssetFlag[]): string {
    const equities = ['SPY.US', 'QQQ.US', 'EXW1.XETRA']
        .map(symbol => moveOf(assets, symbol))
        .filter((m): m is number => m !== null);
    const equity = equities.length > 0 ? equities.reduce((a, b) => a + b, 0) / equities.length : null;
    const gold = moveOf(assets, 'XAUUSD.FOREX');
    const usdJpy = moveOf(assets, 'USDJPY.FOREX');
    const eurUsd = moveOf(assets, 'EURUSD.FOREX');
    const dollarDown = (eurUsd !== null && eurUsd > 0) || (usdJpy !== null && usdJpy < 0);
    const dollarUp = (eurUsd !== null && eurUsd < 0) || (usdJpy !== null && usdJpy > 0);

    if (equity !== null && equity < 0 && gold !== null && gold > 0 && dollarDown) {
        return "Actions en baisse, or en hausse, dollar en baisse : les investisseurs doutent des actifs américains eux-mêmes (politique, Fed, dette), pas seulement de la croissance.";
    }
    if (equity !== null && equity < 0 && (gold ?? 0) >= 0 && usdJpy !== null && usdJpy < 0) {
        return 'Actions en baisse, yen et or recherchés : fuite classique vers les valeurs refuges (« risk-off »).';
    }
    if (equity !== null && equity < 0 && dollarUp) {
        return "Actions en baisse et dollar en hausse : le marché anticipe des taux américains plus hauts ou plus longtemps, ce qui pèse sur la valorisation des actions.";
    }
    if (equity !== null && equity > 0 && dollarDown) {
        return "Actions en hausse et dollar en baisse : le marché anticipe un assouplissement (baisse de taux, désescalade), favorable aux actifs risqués.";
    }
    if (equity !== null && equity > 0 && usdJpy !== null && usdJpy > 0) {
        return "Actions en hausse, yen en baisse : retour de l'appétit pour le risque (« risk-on »), les refuges sont délaissés.";
    }
    const onlyEquities = equity !== null && gold === null && eurUsd === null && usdJpy === null;
    if (onlyEquities) {
        return equity > 0
            ? "Hausse brutale des actions sans réaction des devises ni de l'or : plutôt une nouvelle propre aux actions (résultats d'un poids lourd, espoir sur un secteur) qu'un choc macro."
            : "Baisse brutale des actions sans réaction des devises ni de l'or : plutôt une nouvelle propre aux actions (résultats d'un poids lourd, inquiétude sur un secteur) qu'un choc macro.";
    }
    if (equity === null && gold !== null) {
        return "Mouvement concentré sur l'or et les devises : choc macro ou géopolitique, les actions ne l'ont pas encore intégré (marchés fermés ou données différées).";
    }
    return 'Mouvement simultané sur plusieurs classes d’actifs : un même événement est en train d’être intégré par le marché.';
}

export function fallbackExplanation(shock: Shock, status: ShockExplanation['status']): ShockExplanation {
    return {
        status,
        cause: 'Cause pas encore identifiée',
        confidence: 'incertaine',
        lesson: describePattern(shock.assets),
        channels: [],
        sources: [],
        pattern: describePattern(shock.assets),
        generatedAt: new Date().toISOString(),
    };
}

export function buildShockPrompt(shock: Shock, noAdviceRule: string): string {
    const moves = shock.assets
        .map(asset => `- ${asset.label} : ${signed(asset.movePct)} en 5 minutes (${Math.abs(asset.zScore).toFixed(1)} fois l'agitation habituelle de l'heure précédente)`)
        .join('\n');
    return `Un choc de marché vient d'être détecté le ${parisTime(shock.startedAt)} (heure de Paris), soit ${new Date(shock.startedAt * 1000).toISOString()} UTC.
Mouvements mesurés :
${moves}

Ta mission, pour des investisseurs particuliers européens :
1. Trouve avec la recherche web l'événement qui a déclenché ce mouvement dans les minutes qui précèdent (déclaration, post officiel, chiffre macro, décision de banque centrale, dépêche). Privilégie les sources primaires (site officiel, banque centrale, institut statistique, compte officiel) et les grandes agences de presse. Si rien ne colle à l'horaire, dis-le.
2. Explique simplement pourquoi ce type d'événement fait bouger ces actifs dans ce sens.
3. Indique quels segments de marché sont typiquement touchés et comment (ex. « exportateurs européens », « banques », « valeurs technologiques »).

${noAdviceRule}

Réponds uniquement avec un objet JSON, sans texte autour :
{"cause":"une phrase, factuelle, avec l'heure si connue","confidence":"confirmée|probable|incertaine","lesson":"2 à 3 phrases pédagogiques","channels":[{"segment":"...","effect":"..."}],"sources":[{"title":"...","url":"..."}]}
Règles : "confirmée" seulement si une source datée situe l'événement à l'horaire du choc. Au plus 4 canaux, 3 sources. N'invente aucune URL.`;
}

/** URLs Claude actually saw in search results; any other URL in its answer is dropped. */
export function searchResultUrls(content: Anthropic.ContentBlock[]): Set<string> {
    const urls = new Set<string>();
    for (const block of content) {
        if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
            for (const result of block.content) urls.add(result.url);
        }
    }
    return urls;
}

type RawExplanation = Partial<Pick<ShockExplanation, 'cause' | 'confidence' | 'lesson' | 'channels' | 'sources'>>;

export function sanitizeExplanation(shock: Shock, raw: RawExplanation | null, seenUrls: Set<string>): ShockExplanation {
    if (!raw || typeof raw.cause !== 'string') return fallbackExplanation(shock, 'error');
    const confidence = raw.confidence === 'confirmée' || raw.confidence === 'probable' ? raw.confidence : 'incertaine';
    const sources = (Array.isArray(raw.sources) ? raw.sources : [])
        .filter(source => typeof source?.url === 'string' && seenUrls.has(source.url))
        .slice(0, 3)
        .map(source => ({ title: String(source.title || source.url), url: source.url }));
    return {
        status: 'ok',
        cause: raw.cause.slice(0, 400),
        // Without a verifiable source, "confirmed" is not earned
        confidence: confidence === 'confirmée' && sources.length === 0 ? 'probable' : confidence,
        lesson: String(raw.lesson ?? '').slice(0, 800),
        channels: (Array.isArray(raw.channels) ? raw.channels : [])
            .filter(channel => channel && typeof channel.segment === 'string' && typeof channel.effect === 'string')
            .slice(0, 4),
        sources,
        pattern: describePattern(shock.assets),
        generatedAt: new Date().toISOString(),
    };
}
