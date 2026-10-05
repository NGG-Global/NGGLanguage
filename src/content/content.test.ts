import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { content } from '.';
import { contentErrors } from './validate';
import { fill } from './format';

const raw = JSON.parse(readFileSync(new URL('../../content/content.json', import.meta.url), 'utf8'));

/** Every string in the content tree with its path. */
function strings(node: unknown, path = ''): [string, string][] {
  if (typeof node === 'string') return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (node && typeof node === 'object') return Object.entries(node).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  return [];
}

describe('content.json', () => {
  it('has every key the UI reads', () => {
    expect(contentErrors(raw)).toEqual([]);
  });

  it('keeps the fixed item order C,M,S,P,C,S,M,P,S,C,P,M', () => {
    expect(content.items.map((i) => i.lang).join('')).toBe('CMSPCSMPSCPM');
  });

  it('uses "אבחון", "מבחן" and "מדויק" only in the disclaimer', () => {
    const allowed = new Set(['ui.result.disclaimer']);
    const hits = strings(raw).filter(([p, s]) => !allowed.has(p) && /אבחון|מבחן|מדויק/.test(s));
    expect(hits).toEqual([]);
  });

  it('reports a missing key instead of rendering undefined', () => {
    const broken = structuredClone(raw);
    delete broken.ui.result.save;
    delete broken.languages.P.weakText;
    expect(contentErrors(broken)).toEqual(expect.arrayContaining(['ui.result.save: expected non-empty string', 'languages.P.weakText: missing']));
  });

  it('fills templates', () => {
    expect(fill(content.ui.question.counter, { n: 7 })).toBe(content.ui.question.counter.replace('{n}', '7'));
    expect(fill('{a} {b}', { a: 1 })).toBe('1 {b}');
  });
});
