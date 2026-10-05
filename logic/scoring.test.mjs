// Run: node --test logic/scoring.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyse, scores } from './scoring.js';

const content = JSON.parse(readFileSync(new URL('../content/content.json', import.meta.url), 'utf8'));
const { items, thresholds } = content;
// item order: C,M,S,P,C,S,M,P,S,C,P,M

test('sample profile: native C, weak P, M fluent, S partial', () => {
  const a = [5, 4, 3, 2, 5, 3, 4, 2, 3, 4, 2, 3];
  assert.deepEqual(scores(a, items), { C: 14, M: 11, S: 9, P: 6 });
  const r = analyse(a, items, thresholds);
  assert.equal(r.native, 'C');
  assert.deepEqual(r.weak, ['P']);
  assert.deepEqual(r.levels, { C: 'native', M: 'fluent', S: 'partial', P: 'weak' });
  assert.equal(r.closeSecond, null);
  assert.equal(r.balanced, false);
});

test('top tie requires tie-break; choice decides native; other tied becomes close second', () => {
  const a = [4, 4, 3, 3, 4, 3, 4, 2, 2, 4, 2, 4]; // C 12, M 12, S 8, P 7
  const pre = analyse(a, items, thresholds);
  assert.equal(pre.needsTieBreak, true);
  assert.deepEqual(pre.tied, ['C', 'M']);
  const r = analyse(a, items, thresholds, 'M');
  assert.equal(r.native, 'M');
  assert.equal(r.closeSecond, 'C');
  assert.deepEqual(r.weak, ['P']);
  assert.throws(() => analyse(a, items, thresholds, 'S'));
});

test('two weak languages', () => {
  const a = [5, 4, 2, 2, 5, 2, 4, 2, 2, 4, 2, 3]; // C 14, M 11, S 6, P 6
  const r = analyse(a, items, thresholds);
  assert.deepEqual(r.weak, ['S', 'P']);
});

test('all equal: four-way tie, three weak, balanced', () => {
  const a = Array(12).fill(3);
  const r = analyse(a, items, thresholds, 'P');
  assert.equal(r.native, 'P');
  assert.deepEqual(r.weak, ['C', 'M', 'S']);
  assert.equal(r.balanced, true);
});

test('close second when gap is 1 and second is not weak', () => {
  const a = [5, 5, 3, 1, 5, 3, 4, 1, 3, 5, 1, 4]; // C 15, M 13, S 9, P 3
  const r1 = analyse(a, items, thresholds);
  assert.equal(r1.closeSecond, null);
  const b = [5, 5, 3, 1, 5, 3, 5, 1, 3, 4, 1, 4]; // C 14, M 14 → tie
  assert.equal(analyse(b, items, thresholds).needsTieBreak, true);
  const c = [5, 5, 3, 1, 5, 3, 4, 1, 3, 4, 1, 4]; // C 14, M 13
  assert.equal(analyse(c, items, thresholds).closeSecond, 'M');
});

test('determinism: same answers → same result', () => {
  const a = [2, 5, 4, 1, 3, 5, 2, 4, 3, 1, 5, 2];
  assert.deepEqual(analyse(a, items, thresholds), analyse(a.slice(), items, thresholds));
});
