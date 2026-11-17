/**
 * Scheduled macro events, with official times. Sources: federalreserve.gov
 * (FOMC calendar), ecb.europa.eu (monetary policy meetings), bls.gov (CPI and
 * Employment Situation schedules). Checked 2026-11-17; the 2025 US releases
 * moved by the federal funding lapse are listed at their actual dates.
 * `confirmed: false` = date not found on the official calendar yet.
 * Update once a year when the institutions publish the next calendar.
 */

export type MacroType = 'FOMC' | 'BCE' | 'CPI' | 'NFP';

export type MacroEvent = { type: MacroType; at: string; confirmed: boolean };

export const MACRO_INFO: Record<MacroType, { name: string; official: string; lesson: string }> = {
    FOMC: {
        name: 'Décision de taux de la Fed',
        official: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
        lesson: "Le marché a déjà intégré la décision attendue : ce qui fait bouger, c'est la surprise et le ton du communiqué et de la conférence de presse sur les prochaines baisses ou hausses.",
    },
    BCE: {
        name: 'Décision de taux de la BCE',
        official: 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.fr.html',
        lesson: "Une BCE plus restrictive que prévu soutient l'euro et les banques mais pèse sur l'immobilier et les valeurs de croissance ; l'inverse si elle surprend à la baisse.",
    },
    CPI: {
        name: 'Inflation américaine (CPI)',
        official: 'https://www.bls.gov/schedule/news_release/cpi.htm',
        lesson: "Une inflation plus forte que prévu fait craindre des taux élevés plus longtemps : les obligations et les valeurs de croissance sont les plus sensibles.",
    },
    NFP: {
        name: 'Emploi américain (NFP)',
        official: 'https://www.bls.gov/schedule/news_release/empSit.htm',
        lesson: "Le rapport sur l'emploi donne la santé de l'économie américaine. Trop fort, il éloigne les baisses de taux ; trop faible, il fait craindre une récession.",
    },
};

const fomc = (date: string, offset: string): MacroEvent => ({ type: 'FOMC', at: `${date}T14:00:00${offset}`, confirmed: true });
const ecb = (date: string, offset: string, confirmed = true): MacroEvent => ({ type: 'BCE', at: `${date}T14:15:00${offset}`, confirmed });
const bls = (type: 'CPI' | 'NFP', date: string, offset: string): MacroEvent => ({ type, at: `${date}T08:30:00${offset}`, confirmed: true });

const EST = '-05:00';
const EDT = '-04:00';
const CET = '+01:00';
const CEST = '+02:00';

export const MACRO_CALENDAR: MacroEvent[] = [
    // FOMC (decision 2:00 pm ET)
    fomc('2025-01-29', EST), fomc('2025-03-19', EDT), fomc('2025-05-07', EDT), fomc('2025-06-18', EDT),
    fomc('2025-07-30', EDT), fomc('2025-09-17', EDT), fomc('2025-10-29', EDT), fomc('2025-12-10', EST),
    fomc('2026-01-28', EST), fomc('2026-03-18', EDT), fomc('2026-04-29', EDT), fomc('2026-06-17', EDT),
    fomc('2026-07-29', EDT), fomc('2026-09-16', EDT), fomc('2026-10-28', EDT), fomc('2026-12-09', EST),
    // ECB (decision 14:15 Frankfurt time)
    ecb('2025-01-30', CET), ecb('2025-03-06', CET), ecb('2025-04-17', CEST), ecb('2025-06-05', CEST),
    ecb('2025-07-24', CEST), ecb('2025-09-11', CEST), ecb('2025-10-30', CET), ecb('2025-12-18', CET),
    ecb('2026-02-05', CET), ecb('2026-03-19', CET), ecb('2026-04-30', CEST), ecb('2026-06-11', CEST),
    ecb('2026-07-23', CEST), ecb('2026-09-10', CEST), ecb('2026-10-29', CET), ecb('2026-12-17', CET, false),
    // US CPI (8:30 am ET); 2026 May-September releases not listed yet
    bls('CPI', '2025-01-15', EST), bls('CPI', '2025-02-12', EST), bls('CPI', '2025-03-12', EDT), bls('CPI', '2025-04-10', EDT),
    bls('CPI', '2025-05-13', EDT), bls('CPI', '2025-06-11', EDT), bls('CPI', '2025-07-15', EDT), bls('CPI', '2025-08-12', EDT),
    bls('CPI', '2025-09-11', EDT), bls('CPI', '2025-10-24', EDT), bls('CPI', '2025-12-18', EST),
    bls('CPI', '2026-01-13', EST), bls('CPI', '2026-03-11', EDT), bls('CPI', '2026-04-10', EDT),
    bls('CPI', '2026-10-14', EDT), bls('CPI', '2026-11-10', EST), bls('CPI', '2026-12-10', EST),
    // US Employment Situation (8:30 am ET)
    bls('NFP', '2025-01-10', EST), bls('NFP', '2025-02-07', EST), bls('NFP', '2025-03-07', EST), bls('NFP', '2025-04-04', EDT),
    bls('NFP', '2025-05-02', EDT), bls('NFP', '2025-06-06', EDT), bls('NFP', '2025-07-03', EDT), bls('NFP', '2025-08-01', EDT),
    bls('NFP', '2025-09-05', EDT), bls('NFP', '2025-11-20', EST), bls('NFP', '2025-12-16', EST),
    bls('NFP', '2026-01-09', EST), bls('NFP', '2026-02-11', EST), bls('NFP', '2026-03-06', EST), bls('NFP', '2026-04-03', EDT),
    bls('NFP', '2026-05-08', EDT), bls('NFP', '2026-06-05', EDT), bls('NFP', '2026-07-02', EDT), bls('NFP', '2026-08-07', EDT),
    bls('NFP', '2026-09-04', EDT), bls('NFP', '2026-10-02', EDT), bls('NFP', '2026-11-06', EST), bls('NFP', '2026-12-04', EST),
];
