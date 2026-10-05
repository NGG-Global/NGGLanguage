// Boot animation timeline, rebuilt from the supplied NGG_Boot_Animation (boot.jsx).
// Same scenes, cues, curves and geometry; no sound; colours mapped to tokens.css.
// Design space: 390×844 phone points.

export const PW = 390;
export const PH = 844;

/** Scene lengths (s) from the original OM_SCENES; cues are the running sums. */
const SCENES = [
  ['Ignite', 0.6], ['Trace', 1.3], ['Swoosh', 0.8], ['Lockup', 0.8], ['Reveal', 1.2], ['Idle', 3],
] as const;
type Scene = (typeof SCENES)[number][0];

export const CUES = SCENES.reduce<Record<Scene, number>>((acc, [name], i) => {
  acc[name] = SCENES.slice(0, i).reduce((s, [, d]) => s + d, 0);
  return acc;
}, {} as Record<Scene, number>);

/** Total length: plays once, then holds the last frame. */
export const DURATION = SCENES.reduce((s, [, d]) => s + d, 0);
/** The CTA is fully in at Reveal + 1.3s; a tap during the animation jumps here. */
export const SETTLED = CUES.Reveal + 1.3;

const Easing = {
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
};
const MOTION = { enter: Easing.easeOutQuart, draw: Easing.easeInOutSine, pop: Easing.easeOutCubic };
type Kind = keyof typeof MOTION;

/** animate({from,to,start,end,ease})(T) from the original engine. */
export function tw(T: number, start: number, end: number, from: number, to: number, kind: Kind = 'enter'): number {
  if (T <= start) return from;
  if (T >= end) return to;
  return from + (to - from) * MOTION[kind]((T - start) / (end - start));
}

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

/** Logo geometry in the 1600×1600 source artwork. */
export const OUTER: [number, number][] = [[812, 158], [1363, 1112], [260, 1112], [812, 158]];
export const INNER: [number, number][] = [[812, 344], [1201, 1020], [422, 1020], [812, 344]];
export const FLARE_AT: [number, number] = [1348, 368];

export function along(pts: [number, number][], p: number): [number, number] {
  const seg: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    seg.push(l);
    total += l;
  }
  let d = clamp(p, 0, 1) * total;
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i] || i === seg.length - 1) {
      const k = seg[i] ? d / seg[i] : 0;
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
    }
    d -= seg[i];
  }
  return pts[0];
}

export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Decorative glyph pool for the "NEXUS 2026" decode. Not UI copy. */
const GLYPHS = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789#/<>';

export function scramble(target: string, p: number, T: number): string {
  let out = '';
  for (let i = 0; i < target.length; i++) {
    const ch = target[i];
    if (ch === ' ') {
      out += ' ';
      continue;
    }
    const at = (i / target.length) * 0.75;
    out += p >= at + 0.25 ? ch : p <= 0 ? '' : GLYPHS[Math.floor(hash(i * 13 + Math.floor(T * 14)) * GLYPHS.length)];
  }
  return out;
}

export const PARTICLES = Array.from({ length: 34 }, (_, i) => ({
  x: hash(i + 1) * PW,
  y: hash(i + 50) * PH,
  v: 3 + hash(i + 90) * 6,
  r: 0.6 + hash(i + 130) * 1.2,
  ph: hash(i + 170) * 6.28,
}));

/** Logo centre and box size: rises from y=456 (300px) to y=300 (186px) during Lockup → Reveal. */
export function logoBox(T: number) {
  const move = tw(T, CUES.Lockup - 0.1, CUES.Reveal + 0.5, 0, 1, 'draw');
  return { cx: PW / 2, cy: 456 + (300 - 456) * move, size: 300 + (186 - 300) * move };
}
