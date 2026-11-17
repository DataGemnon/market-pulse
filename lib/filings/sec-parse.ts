import type { EventKind, WatchlistEvent } from './types';

/** Pure parsing of SEC EDGAR data (submissions JSON, Form 4 XML) into French events. */

export type SecSubmissions = {
    cik: string;
    name?: string;
    filings: {
        recent: {
            accessionNumber: string[];
            filingDate: string[];
            acceptanceDateTime?: string[];
            form: string[];
            items?: string[];
            primaryDocument: string[];
            primaryDocDescription?: string[];
        };
    };
};

const ITEMS_8K: Record<string, { label: string; important: boolean; kind: EventKind }> = {
    '1.01': { label: 'Accord important signé', important: false, kind: 'other' },
    '1.02': { label: "Fin d'un accord important", important: false, kind: 'other' },
    '1.03': { label: 'Procédure de faillite', important: true, kind: 'other' },
    '1.05': { label: 'Incident de cybersécurité', important: true, kind: 'other' },
    '2.01': { label: "Acquisition ou cession d'actifs finalisée", important: false, kind: 'other' },
    '2.02': { label: 'Résultats publiés', important: true, kind: 'results' },
    '2.03': { label: 'Nouvelle dette importante', important: false, kind: 'capital' },
    '2.05': { label: 'Plan de restructuration', important: true, kind: 'other' },
    '2.06': { label: 'Dépréciation importante', important: true, kind: 'results' },
    '3.01': { label: 'Risque de radiation de la cote', important: true, kind: 'other' },
    '3.02': { label: "Émission d'actions hors marché", important: false, kind: 'capital' },
    '3.03': { label: 'Modification des droits des actionnaires', important: false, kind: 'governance' },
    '4.01': { label: "Changement d'auditeur", important: false, kind: 'governance' },
    '4.02': { label: 'Comptes passés à ne plus utiliser (erreur comptable)', important: true, kind: 'results' },
    '5.01': { label: 'Changement de contrôle', important: true, kind: 'stake' },
    '5.02': { label: 'Départ ou nomination de dirigeants', important: true, kind: 'management' },
    '5.03': { label: 'Modification des statuts', important: false, kind: 'governance' },
    '5.07': { label: "Votes de l'assemblée générale", important: false, kind: 'governance' },
    '7.01': { label: 'Communication au marché', important: false, kind: 'other' },
    '8.01': { label: 'Autre événement', important: false, kind: 'other' },
};

const LESSONS: Partial<Record<EventKind, string>> = {
    results: "Les résultats font bouger un titre surtout par l'écart avec ce que le marché attendait et par les perspectives (« guidance »), plus que par le chiffre lui-même.",
    management: "Un départ soudain du directeur général ou financier est souvent lu comme un signal d'incertitude ; une nomination attendue l'est beaucoup moins.",
    insider: "Les ventes de dirigeants sont fréquentes (fiscalité, diversification, plans programmés) et peu informatives. Les achats sur leurs propres deniers sont plus rares et plus suivis par le marché.",
    stake: "Un investisseur qui dépasse 5 % du capital doit le déclarer. En 13D il annonce vouloir peser sur la stratégie (investisseur activiste), en 13G il reste passif.",
};

type FormInfo = { title: string; kind: EventKind; important: boolean };

function formInfo(form: string): FormInfo | null {
    const f = form.toUpperCase();
    if (f === '10-Q') return { title: 'Rapport trimestriel (10-Q)', kind: 'results', important: true };
    if (f === '10-K') return { title: 'Rapport annuel (10-K)', kind: 'results', important: true };
    if (f === '20-F') return { title: 'Rapport annuel émetteur étranger (20-F)', kind: 'results', important: true };
    if (f === '6-K') return { title: 'Communiqué émetteur étranger (6-K)', kind: 'other', important: false };
    if (f === '4') return { title: "Transaction d'un dirigeant (Form 4)", kind: 'insider', important: false };
    if (/^(SC |SCHEDULE )13D/.test(f)) return { title: 'Participation de plus de 5 %, investisseur actif (13D)', kind: 'stake', important: true };
    if (/^(SC |SCHEDULE )13G/.test(f)) return { title: 'Participation de plus de 5 %, investisseur passif (13G)', kind: 'stake', important: false };
    return null;
}

const archiveBase = (cik: string, accession: string) =>
    `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, '')}`;

/** The raw XML of a Form 4 (EDGAR lists the XSL-rendered path as primary document). */
export function form4XmlUrl(cik: string, accession: string, primaryDocument: string): string {
    return `${archiveBase(cik, accession)}/${primaryDocument.replace(/^xsl[^/]*\//i, '')}`;
}

export function parseSubmissions(data: SecSubmissions, symbol: string, sinceDate: string): WatchlistEvent[] {
    const recent = data.filings.recent;
    const events: WatchlistEvent[] = [];
    for (let i = 0; i < recent.form.length; i++) {
        if (recent.filingDate[i] < sinceDate) continue;
        const form = recent.form[i];
        const accession = recent.accessionNumber[i];
        const docUrl = `${archiveBase(data.cik, accession)}/${recent.primaryDocument[i]}`;
        const indexUrl = `${archiveBase(data.cik, accession)}/${accession}-index.htm`;
        const publishedAt = recent.acceptanceDateTime?.[i] || `${recent.filingDate[i]}T00:00:00Z`;
        const base = { id: `sec-${accession}`, symbol, source: 'SEC' as const, publishedAt, url: indexUrl, docUrl };

        if (form === '8-K' || form === '8-K/A') {
            const items = (recent.items?.[i] ?? '').split(',').map(s => s.trim()).filter(code => ITEMS_8K[code]);
            if (items.length === 0) continue; // 9.01 exhibits only
            const main = items.find(code => ITEMS_8K[code].important) ?? items[0];
            const info = ITEMS_8K[main];
            events.push({
                ...base,
                kind: info.kind,
                important: items.some(code => ITEMS_8K[code].important),
                title: items.map(code => ITEMS_8K[code].label).join(' · '),
                lesson: LESSONS[info.kind],
            });
            continue;
        }
        const info = formInfo(form);
        if (!info) continue;
        events.push({
            ...base,
            kind: info.kind,
            important: info.important,
            title: info.title,
            lesson: LESSONS[info.kind],
            docUrl: info.kind === 'insider' ? form4XmlUrl(data.cik, accession, recent.primaryDocument[i]) : docUrl,
        });
    }
    return events;
}

// ── Form 4 ────────────────────────────────────────────────────────────────

export type InsiderTrade = {
    owner: string;
    role: string;
    code: string;
    shares: number;
    price: number | null;
    acquired: boolean;
};

const CODE_LABELS: Record<string, string> = {
    P: 'achat en bourse',
    S: 'vente en bourse',
    M: "exercice d'options",
    A: "attribution gratuite d'actions",
    F: "actions retenues pour payer l'impôt",
    G: 'donation',
};

/** Text of <name>, or of its <value> child (EDGAR wraps most numbers, sometimes with footnotes). */
const tag = (xml: string, name: string): string | null => {
    const block = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'));
    if (!block) return null;
    const value = block[1].match(/<value>([^<]*)<\/value>/i);
    return (value ? value[1] : block[1].replace(/<[^>]+>/g, '')).trim();
};

export function parseForm4(xml: string): InsiderTrade[] {
    const owner = tag(xml, 'rptOwnerName') ?? 'Un dirigeant';
    const role = tag(xml, 'officerTitle') || (tag(xml, 'isDirector') === '1' || tag(xml, 'isDirector') === 'true' ? 'administrateur' : '')
        || (/<isTenPercentOwner>\s*(1|true)/i.test(xml) ? 'actionnaire de plus de 10 %' : '');
    const blocks = xml.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/gi) ?? [];
    return blocks.map(block => {
        const price = Number(tag(block, 'transactionPricePerShare'));
        return {
            owner,
            role,
            code: tag(block, 'transactionCode') ?? '?',
            shares: Number(tag(block, 'transactionShares')) || 0,
            price: Number.isFinite(price) && price > 0 ? price : null,
            acquired: tag(block, 'transactionAcquiredDisposedCode') === 'A',
        };
    });
}

const fmt = (n: number, digits = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: digits });

/** One factual French sentence summarising a Form 4. */
export function describeForm4(trades: InsiderTrade[]): string | null {
    if (trades.length === 0) return null;
    const { owner, role } = trades[0];
    const byCode = new Map<string, { shares: number; value: number }>();
    for (const trade of trades) {
        const entry = byCode.get(trade.code) ?? { shares: 0, value: 0 };
        entry.shares += trade.shares;
        entry.value += trade.price ? trade.shares * trade.price : 0;
        byCode.set(trade.code, entry);
    }
    const parts = [...byCode.entries()].map(([code, { shares, value }]) => {
        const label = CODE_LABELS[code] ?? `opération (code ${code})`;
        const amount = value > 0 ? ` pour environ ${fmt(value / 1e6, 1)} M$` : '';
        return `${label} de ${fmt(shares)} actions${amount}`;
    });
    return `${owner}${role ? ` (${role})` : ''} : ${parts.join(', ')}.`;
}
