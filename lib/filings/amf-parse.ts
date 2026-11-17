import type { EventKind, WatchlistEvent } from './types';

/**
 * Pure parsing of the DILA / AMF regulated-information feed
 * (info-financiere.gouv.fr, Opendatasoft dataset "flux-amf-new-prod").
 */

export type AmfRecord = {
    uin_idt_uin: string;
    uin_dat_amf: string;
    identificationsociete_iso_nom_soc: string | null;
    identificationsociete_iso_cd_isi: string | null;
    type_d_information: string | null;
    sous_type_d_information: string | null;
    informationdeposee_inf_tit_inf: string | null;
    url_de_recuperation: string | null;
};

export const AMF_FIELDS: (keyof AmfRecord)[] = [
    'uin_idt_uin', 'uin_dat_amf', 'identificationsociete_iso_nom_soc', 'identificationsociete_iso_cd_isi',
    'type_d_information', 'sous_type_d_information', 'informationdeposee_inf_tit_inf', 'url_de_recuperation',
];

// Share buyback declarations are excluded on purpose (product decision).
const EXCLUDED_SUBTYPES = [/acquisition ou cession des actions de l'émetteur/i, /rachat/i];

const SUBTYPES: { match: RegExp; kind: EventKind; important: boolean; label: string }[] = [
    { match: /informations? privilégiée/i, kind: 'inside_info', important: true, label: 'Information privilégiée' },
    { match: /rapport financier annuel/i, kind: 'results', important: true, label: 'Rapport financier annuel' },
    { match: /rapport financier semestriel/i, kind: 'results', important: true, label: 'Rapport financier semestriel' },
    { match: /trimestrielle/i, kind: 'results', important: true, label: 'Information financière trimestrielle' },
    { match: /droits de vote et du capital/i, kind: 'capital', important: false, label: 'Nombre d’actions et de droits de vote' },
    { match: /assemblée|honoraires|gouvernement d'entreprise/i, kind: 'governance', important: false, label: 'Gouvernance' },
];

const LESSONS: Partial<Record<EventKind, string>> = {
    inside_info: "Une « information privilégiée » est une nouvelle susceptible de faire bouger le cours (résultats, contrat, avertissement, acquisition). La loi oblige l'entreprise à la publier dès que possible : c'est souvent la source originale de ce que reprend la presse.",
    results: "Les comptes publiés sont la référence officielle. Le marché réagit surtout à l'écart avec ce qu'il attendait et aux perspectives annoncées.",
    capital: 'Publication mensuelle de routine : elle sert à calculer les franchissements de seuils des actionnaires.',
};

const clean = (text: string | null) => (text ?? '').replace(/\s+/g, ' ').trim();

export function parseAmfRecords(records: AmfRecord[], symbolByIsin: Map<string, string>): WatchlistEvent[] {
    const events: WatchlistEvent[] = [];
    for (const record of records) {
        const isin = clean(record.identificationsociete_iso_cd_isi).toUpperCase();
        const symbol = symbolByIsin.get(isin);
        const subtype = clean(record.sous_type_d_information);
        const url = clean(record.url_de_recuperation);
        if (!symbol || !url || EXCLUDED_SUBTYPES.some(re => re.test(subtype))) continue;

        const category = SUBTYPES.find(s => s.match.test(subtype));
        const kind = category?.kind ?? 'other';
        const title = clean(record.informationdeposee_inf_tit_inf) || category?.label || subtype || 'Publication réglementée';
        events.push({
            id: `amf-${record.uin_idt_uin}`,
            symbol,
            source: 'AMF',
            kind,
            important: category?.important ?? false,
            title,
            detail: category?.label ?? subtype,
            lesson: LESSONS[kind],
            publishedAt: record.uin_dat_amf,
            url,
            docUrl: url,
        });
    }
    return events;
}

/** ODSQL filter for a set of ISINs since a date. ISINs are validated, so no injection. */
export function buildAmfWhere(isins: string[], since: Date): string {
    const valid = isins.filter(isin => /^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin));
    const list = valid.map(isin => `"${isin}"`).join(', ');
    return `identificationsociete_iso_cd_isi in (${list}) and uin_dat_amf >= date'${since.toISOString()}'`;
}
