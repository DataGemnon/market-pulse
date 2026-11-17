export const fmtPct = (value: number | null | undefined, digits = 1): string =>
    value === null || value === undefined
        ? '–'
        : `${value >= 0 ? '+' : ''}${value.toFixed(digits).replace('.', ',')} %`;

export const parisDateTime = (date: string | number): string =>
    new Date(typeof date === 'number' ? date * 1000 : date).toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

export const parisDate = (date: string): string =>
    new Date(date).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: 'numeric', month: 'short' });

export const moveColor = (value: number | null | undefined): string =>
    value === null || value === undefined ? 'text-slate-400' : value >= 0 ? 'text-emerald-400' : 'text-red-400';

export const CARD = 'bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/[0.06] overflow-hidden';
