import { describe, expect, it } from 'vitest';
import { content } from '../content';
import { analyse } from '../logic';
import { buildCalcDots, buildLabels, buildRoute, buildTerraces } from './geometry';

// Reference: route() from design-source/Main.dc.html, copied verbatim (data inlined).
function prototypeRoute(nk: 'C' | 'M' | 'S' | 'P', mk: 'C' | 'M' | 'S' | 'P', lift: number) {
  const pos = { C: [252, 122], M: [90, 122], S: [252, 232], P: [90, 232] } as const;
  const C = [171, 177];
  const n = [pos[nk][0], pos[nk][1] + lift], m = pos[mk];
  const sx = n[0] > C[0] ? 1 : -1, sy = C[1] > n[1] ? 1 : -1;
  const c1 = [n[0], n[1] + 46 * sy];
  const c2 = [C[0] + sx * 44, C[1] - 22 * sy];
  const c3 = [2 * C[0] - c2[0], 2 * C[1] - c2[1]];
  const c4 = [m[0], m[1] - 40 * (m[1] > C[1] ? 1 : -1)];
  const seg = (p0: readonly number[], p1: readonly number[], p2: readonly number[], p3: readonly number[]) => {
    let len = 0, px = p0[0], py = p0[1];
    for (let i = 1; i <= 40; i++) {
      const t = i / 40, u = 1 - t;
      const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
      const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
      len += Math.hypot(x - px, y - py); px = x; py = y;
    }
    return len;
  };
  const fmt = (p: readonly number[]) => p[0].toFixed(1) + ' ' + p[1].toFixed(1);
  const len = seg(n, c1, c2, C) + seg(C, c3, c4, m);
  return { d: 'M ' + fmt(n) + ' C ' + fmt(c1) + ' ' + fmt(c2) + ' ' + fmt(C) + ' C ' + fmt(c3) + ' ' + fmt(c4) + ' ' + fmt(m), len: Math.ceil(len) + 4 };
}

const SAMPLE = [5, 4, 3, 2, 5, 3, 4, 2, 3, 4, 2, 3];

describe('map geometry', () => {
  it('light route matches the prototype formula for every native/weak pair', () => {
    const langs = ['C', 'M', 'S', 'P'] as const;
    for (const n of langs) for (const w of langs) {
      if (n === w) continue;
      const r = buildRoute(content, n, w);
      const ref = prototypeRoute(n, w, -36);
      expect(r.d).toBe(ref.d);
      expect(r.len).toBe(ref.len);
    }
  });

  it('terrace heights follow content.json layer counts by level', () => {
    const a = analyse(SAMPLE, content.items, content.thresholds);
    const t = Object.fromEntries(buildTerraces(content, 'result', a).map((x) => [x.lang, x.layers.length]));
    expect(t).toEqual({ C: 9, M: 7, S: 5, P: 1 });
    const flat = buildTerraces(content, 'welcome', null);
    expect(flat.every((x) => x.layers.length === content.map.terraceLayers.flat)).toBe(true);
    const top = buildTerraces(content, 'result', a)[0].layers.at(-1)!;
    expect(top.lift).toBe(-(8 * content.map.layerStep));
    expect(top.alpha).toBe(0.82);
  });

  it('labels carry status text only on the result map', () => {
    const a = analyse(SAMPLE, content.items, content.thresholds);
    const res = buildLabels(content, 'result', a);
    expect(res.find((l) => l.lang === 'P')!.status).toBe(content.ui.map.status.missing);
    expect(res.find((l) => l.lang === 'C')!.status).toBe(content.ui.map.status.native);
    expect(buildLabels(content, 'welcome', null).every((l) => l.status === null)).toBe(true);
    expect(buildLabels(content, 'calc', null).every((l) => l.status === null)).toBe(true);
  });

  it('calc sends exactly three dots to each terrace', () => {
    const dots = buildCalcDots(content);
    expect(dots).toHaveLength(12);
    for (const k of ['C', 'M', 'S', 'P'] as const) {
      const [x, y] = content.map.positions[k];
      const mine = dots.filter((d) => d.to[1] === y && Math.abs(d.to[0] - x) <= 16);
      expect(mine).toHaveLength(3);
    }
    expect(dots[11].delay).toBe(0.66);
  });
});
