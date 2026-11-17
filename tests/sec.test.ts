import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { describeForm4, form4XmlUrl, parseForm4, parseSubmissions, type SecSubmissions } from '@/lib/filings/sec-parse';

const fixture = (name: string) => fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');

describe('SEC submissions', () => {
    const data = JSON.parse(fixture('sec-submissions-aapl.json')) as SecSubmissions;
    const events = parseSubmissions(data, 'AAPL', '2026-01-01');

    it('keeps 8-K, Form 4 and drops other forms (144)', () => {
        expect(events.some(e => e.title.includes('Form 4'))).toBe(true);
        expect(events.every(e => !e.title.includes('144'))).toBe(true);
        expect(events.every(e => e.publishedAt >= '2026-01-01')).toBe(true);
    });

    it('labels 8-K items in French and flags results as important', () => {
        const results = events.find(e => e.title === 'Résultats publiés');
        expect(results?.important).toBe(true);
        expect(results?.kind).toBe('results');
        expect(events.some(e => e.title === 'Départ ou nomination de dirigeants')).toBe(true);
        expect(results?.lesson).toMatch(/attendait/);
    });

    it('points Form 4 to the raw XML, not the XSL view', () => {
        const form4 = events.find(e => e.kind === 'insider')!;
        expect(form4.docUrl).toMatch(/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/320193\/\d+\/form4\.xml$/);
        expect(form4XmlUrl('0000320193', '0000320193-26-000001', 'xslF345X06/form4.xml')).toBe(
            'https://www.sec.gov/Archives/edgar/data/320193/000032019326000001/form4.xml',
        );
    });
});

describe('Form 4', () => {
    it('decodes a real Snowflake CFO filing', () => {
        const trades = parseForm4(fixture('sec-form4-snow.xml'));
        expect(trades[0]).toMatchObject({ owner: 'Scarpelli Michael', role: 'Chief Financial Officer', code: 'M', shares: 200000 });
        const text = describeForm4(trades)!;
        expect(text).toContain("exercice d'options");
        expect(text).toContain('vente en bourse');
        console.log(text);
    });
});
