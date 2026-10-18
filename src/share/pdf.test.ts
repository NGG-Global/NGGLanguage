import { describe, expect, it } from 'vitest';
import { buildPdf } from './pdf';
import { content } from '../content';
import type { Content } from '../content/types';
import { analyse } from '../logic';
import { buildReportModel, reportStrings } from './report';

const dec = new TextDecoder('latin1');
const fakeJpeg = (n: number) => new Uint8Array([0xff, 0xd8, ...Array(n).fill(0x41), 0xff, 0xd9]);

describe('PDF writer', () => {
  const bytes = buildPdf([{ jpeg: fakeJpeg(10), px: [30, 40] }, { jpeg: fakeJpeg(20), px: [30, 40] }], [595.28, 841.89], 'איזו שפה');
  const text = dec.decode(bytes);

  it('writes a complete PDF 1.4 file', () => {
    expect(text.startsWith('%PDF-1.4\n')).toBe(true);
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
    expect(text).toContain('/Count 2');
    expect(text.match(/\/Type \/Page /g)).toHaveLength(2);
    expect(text).toContain('/MediaBox [0 0 595.28 841.89]');
    expect(text).toContain('/Filter /DCTDecode /Length 14');
    expect(Array.from(bytes.slice(10, 14))).toEqual([0xe2, 0xe3, 0xcf, 0xd3]);
  });

  it('has a cross-reference table that points at every object', () => {
    const startxref = Number(text.match(/startxref\n(\d+)/)![1]);
    expect(text.slice(startxref, startxref + 4)).toBe('xref');
    const rows = [...text.slice(startxref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
    expect(rows).toHaveLength(3 + 2 * 3);
    rows.forEach((off, i) => expect(text.slice(off, off + `${i + 1} 0 obj`.length)).toBe(`${i + 1} 0 obj`));
  });

  it('stores a Hebrew title as UTF-16BE', () => {
    expect(text).toContain('/Title <FEFF05D005D905D605D5002005E905E405D4>');
  });
});

describe('PDF report model', () => {
  it('carries the whole result: native, every weak language with its take-home question, disclaimer', () => {
    const a = analyse([5, 4, 2, 2, 5, 2, 4, 2, 2, 4, 2, 3], content.items, content.thresholds); // weak S, P
    const m = buildReportModel(content, a);
    expect(m.nativeName).toBe(content.languages.C.name);
    expect(m.weak.map((w) => w.name)).toEqual([content.languages.S.name, content.languages.P.name]);
    expect(m.weak[0].label).toBe(content.ui.result.weakLabelMulti);
    expect(m.takeaways.map((t) => t.text)).toEqual([content.languages.S.takeaway, content.languages.P.takeaway]);
    expect(m.disclaimer).toBe(content.ui.result.disclaimer);
    expect(m.balanced).toBeNull();
    expect(m.version).toContain(content.version);
  });

  it('follows renamed terms in content.json', () => {
    const renamed: Content = structuredClone(content);
    renamed.languages.C.name = 'כיוון';
    const strings = reportStrings(buildReportModel(renamed, analyse([5, 4, 3, 2, 5, 3, 4, 2, 3, 4, 2, 3], renamed.items, renamed.thresholds)));
    expect(strings).toContain('כיוון');
    expect(strings.join(' ')).not.toContain(content.languages.C.name);
  });
});
