import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { buildAmfWhere, parseAmfRecords, type AmfRecord } from '@/lib/filings/amf-parse';

// Real records from the DILA feed (November 2026), Licence Ouverte
const records = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'amf-records.json'), 'utf8')) as AmfRecord[];
const isinOf = (name: string) => records.find(r => r.identificationsociete_iso_nom_soc === name)!.identificationsociete_iso_cd_isi!;

describe('AMF regulated information', () => {
    const symbols = new Map(records.map(r => [r.identificationsociete_iso_cd_isi!, `${r.identificationsociete_iso_nom_soc}.PA`]));
    const events = parseAmfRecords(records, symbols);

    it('only keeps companies of the watchlist', () => {
        const one = new Map([[isinOf('MERSEN'), 'MRN.PA']]);
        const mine = parseAmfRecords(records, one);
        expect(mine.length).toBeGreaterThan(0);
        expect(mine.every(e => e.symbol === 'MRN.PA')).toBe(true);
    });

    it('excludes share buyback declarations', () => {
        const buybacks = records.filter(r => /Acquisition ou cession/.test(r.sous_type_d_information ?? ''));
        expect(buybacks.length).toBeGreaterThan(0);
        for (const record of buybacks) expect(events.find(e => e.id === `amf-${record.uin_idt_uin}`)).toBeUndefined();
    });

    it('flags inside information as important, monthly share counts as routine', () => {
        expect(events.filter(e => e.kind === 'inside_info').every(e => e.important)).toBe(true);
        expect(events.filter(e => e.kind === 'capital').every(e => !e.important)).toBe(true);
        expect(events.every(e => e.docUrl.startsWith('https://'))).toBe(true);
    });

    it('builds a safe ODSQL filter', () => {
        const where = buildAmfWhere(['FR0000039620', 'bad" or 1=1'], new Date('2026-11-01T00:00:00Z'));
        expect(where).toBe(`identificationsociete_iso_cd_isi in ("FR0000039620") and uin_dat_amf >= date'2026-11-01T00:00:00.000Z'`);
    });
});
