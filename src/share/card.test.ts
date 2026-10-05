import { describe, expect, it } from 'vitest';
import { content } from '../content';
import type { Content } from '../content/types';
import { analyse } from '../logic';
import { buildCardModel, cardStrings } from './card';

const SAMPLE = [5, 4, 3, 2, 5, 3, 4, 2, 3, 4, 2, 3];

describe('share card model', () => {
  it('uses the first-person labels and names native and weak languages', () => {
    const m = buildCardModel(content, analyse(SAMPLE, content.items, content.thresholds));
    expect(m.nativeLabel).toBe(content.ui.share.nativeLabel);
    expect(m.nativeName).toBe(content.languages.C.name);
    expect(m.weakLabel).toBe(content.ui.share.weakLabelSingle);
    expect(m.bring).toBe(content.ui.share.bring);
    expect(m.weakNames).toBe(content.languages.P.name);
    expect(m.map.routes).toHaveLength(1);
  });

  it('plural label and every weak language when there are several', () => {
    const a = analyse([5, 4, 2, 2, 5, 2, 4, 2, 2, 4, 2, 3], content.items, content.thresholds);
    const m = buildCardModel(content, a);
    expect(m.weakLabel).toBe(content.ui.share.weakLabelMulti);
    expect(m.weakList).toEqual([content.languages.S.name, content.languages.P.name]);
    expect(m.map.routes).toHaveLength(2);
  });

  it('follows renamed terms in content.json', () => {
    const renamed: Content = structuredClone(content);
    renamed.languages.C.name = 'כיוון';
    renamed.languages.P.name = 'הטמעה';
    renamed.ui.share.bring = '+ איתי';
    const strings = cardStrings(buildCardModel(renamed, analyse(SAMPLE, renamed.items, renamed.thresholds)));
    expect(strings).toEqual(expect.arrayContaining(['כיוון', 'הטמעה', '+ איתי']));
    expect(strings.join(' ')).not.toContain(content.languages.C.name);
    expect(strings.join(' ')).not.toContain(content.languages.P.name);
  });
});
