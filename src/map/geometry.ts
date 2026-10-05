// Map geometry, shared by the DOM map and the share-card painter.
// Sizes, positions, node, layer counts and layer step come from content.json (map.*).
// The decorative constants below (stars, route curvature, label box) come from the
// approved prototype (design-source/Main.dc.html) and the handoff spec.

import type { Content, Lang, LevelKey, Point } from '../content/types';
import { levelKey, type Analysis } from '../logic';

/** Terrace layer square, before the iso transform (tokens: --terrace-square). */
export const SQUARE = 92;
/** Floor grid square inside the map (prototype: 300×300 at 21,27, 30px cells). */
export const FLOOR = { x: 21, y: 27, size: 300, cell: 30 };
/** Map labels: 140px wide boxes, top row at y=2, bottom row at y=272. */
export const LABEL = { width: 140, topY: 2, bottomY: 272 };
/** Light-route curvature (handoff spec: C1 ±46, C2 ±44/±22, C4 ±40). */
const ROUTE_K = { c1: 46, c2x: 44, c2y: 22, c4: 40 };
/** Calc dots sit 16px apart on their terrace. */
const CALC_DOT_GAP = 16;
/** [x, y, diameter] — decorative stars. */
export const STARS: [number, number, number][] = [
  [18, 40, 2], [64, 14, 1.5], [140, 30, 2], [212, 8, 1.5], [300, 34, 2], [330, 120, 1.5], [12, 170, 1.5],
  [120, 160, 2], [226, 168, 1.5], [326, 250, 2], [40, 290, 1.5], [168, 296, 2], [286, 302, 1.5], [196, 70, 1.5],
];

export type MapMode = 'welcome' | 'calc' | 'result';
export type TerraceLook = LevelKey | 'flat' | 'calc';

export interface Layer {
  /** Index from the floor up. */
  j: number;
  /** Vertical offset when risen (negative = up). */
  lift: number;
  isTop: boolean;
  /** Outline alpha, rising from .22 at the floor to .82 at the top. */
  alpha: number;
}

export interface Terrace {
  lang: Lang;
  look: TerraceLook;
  center: Point;
  /** Top-left of the 92px square. */
  origin: Point;
  layers: Layer[];
  /** Index in languageOrder; drives the stagger. */
  order: number;
}

export interface MapLabel {
  lang: Lang;
  name: string;
  status: string | null;
  look: TerraceLook;
  x: number;
  y: number;
  topRow: boolean;
  order: number;
}

export interface Route {
  weak: Lang;
  d: string;
  len: number;
  start: Point;
}

export function lookFor(mode: MapMode, lang: Lang, analysis: Analysis | null): TerraceLook {
  if (mode === 'welcome') return 'flat';
  if (mode === 'calc' || !analysis) return 'calc';
  return levelKey(analysis.levels[lang]);
}

export function buildTerraces(content: Content, mode: MapMode, analysis: Analysis | null): Terrace[] {
  const g = content.map;
  return content.languageOrder.map((lang, order) => {
    const look = lookFor(mode, lang, analysis);
    const n = g.terraceLayers[look];
    const [cx, cy] = g.positions[lang];
    const layers: Layer[] = Array.from({ length: n }, (_, j) => ({
      j,
      lift: -(j * g.layerStep),
      isTop: j === n - 1,
      alpha: +(0.22 + (0.6 * (j + 1)) / n).toFixed(2),
    }));
    return { lang, look, center: [cx, cy], origin: [cx - SQUARE / 2, cy - SQUARE / 2], layers, order };
  });
}

export function buildLabels(content: Content, mode: MapMode, analysis: Analysis | null): MapLabel[] {
  const g = content.map;
  return content.languageOrder.map((lang, order) => {
    const look = lookFor(mode, lang, analysis);
    const [cx, cy] = g.positions[lang];
    const topRow = cy < g.node[1];
    const status = mode === 'result' && look !== 'flat' && look !== 'calc' ? content.ui.map.status[look] : null;
    return {
      lang, name: content.languages[lang].name, status, look,
      x: cx - LABEL.width / 2, y: topRow ? LABEL.topY : LABEL.bottomY, topRow, order,
    };
  });
}

type Bez = [Point, Point, Point, Point];

function bezierLength([p0, p1, p2, p3]: Bez, steps = 40): number {
  let len = 0;
  let [px, py] = p0;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    len += Math.hypot(x - px, y - py);
    px = x;
    py = y;
  }
  return len;
}

const f = (p: Point) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

/** Light route: native top surface → integration node → weak terrace base. */
export function buildRoute(content: Content, native: Lang, weak: Lang): Route {
  const g = content.map;
  const C = g.node;
  const lift = -((g.terraceLayers.native - 1) * g.layerStep);
  const n: Point = [g.positions[native][0], g.positions[native][1] + lift];
  const m = g.positions[weak];
  const sx = n[0] > C[0] ? 1 : -1;
  const sy = C[1] > n[1] ? 1 : -1;
  const c1: Point = [n[0], n[1] + ROUTE_K.c1 * sy];
  const c2: Point = [C[0] + sx * ROUTE_K.c2x, C[1] - ROUTE_K.c2y * sy];
  const c3: Point = [2 * C[0] - c2[0], 2 * C[1] - c2[1]];
  const c4: Point = [m[0], m[1] - ROUTE_K.c4 * (m[1] > C[1] ? 1 : -1)];
  const len = bezierLength([n, c1, c2, C]) + bezierLength([C, c3, c4, m]);
  return {
    weak,
    d: `M ${f(n)} C ${f(c1)} ${f(c2)} ${f(C)} C ${f(c3)} ${f(c4)} ${f(m)}`,
    len: Math.ceil(len) + 4,
    start: n,
  };
}

export function buildRoutes(content: Content, analysis: Analysis): Route[] {
  return analysis.weak.map((w) => buildRoute(content, analysis.native, w));
}

export interface CalcDot {
  to: Point;
  delay: number;
}

/** S6: every answer travels from the node to its own language, three per terrace. */
export function buildCalcDots(content: Content): CalcDot[] {
  const seen: Record<Lang, number> = { C: 0, M: 0, S: 0, P: 0 };
  return content.items.map((it, i) => {
    const k = seen[it.lang]++;
    const [x, y] = content.map.positions[it.lang];
    return { to: [x + (k - 1) * CALC_DOT_GAP, y], delay: +(i * 0.06).toFixed(2) };
  });
}

/** S3: neutral orbit around the core. Position depends on the item index only, never on its language. */
export function orbitPoint(i: number, rx = 44, ry = 22): Point {
  const a = ((-90 + i * 30) * Math.PI) / 180;
  return [rx * Math.cos(a), ry * Math.sin(a)];
}
