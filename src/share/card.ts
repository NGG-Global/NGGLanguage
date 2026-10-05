// Share card (X): drawn directly with Canvas 2D at 1080×1920 (3× a 360×640 layout),
// client-side only. Mirrors screens/11-R3-ShareCard.png and the map geometry used on R.

import type { Content, Lang } from '../content/types';
import { joinNames } from '../content/format';
import type { Analysis } from '../logic';
import {
  FLOOR, LABEL, SQUARE, STARS, buildLabels, buildRoutes, buildTerraces, type MapLabel, type Terrace,
} from '../map/geometry';

export const CARD_W = 360;
export const CARD_H = 640;
export const CARD_SCALE = 3;
const PAD = 26;
const MAP_SCALE = 0.8;

const C = {
  night: '#00002C', sky: '#8DB0FF', mist: '#CFE0FF', ice: '#D6E2FF', whiteSoft: '#E6EEFF', white: '#FFFFFF',
  magenta: '#EC2A8C', neon: '#FA218D', soft: '#F284BD', pale: '#F7B3D6',
};

/** Everything the card shows, in drawing order. Pure: used by tests and the painter. */
export interface CardModel {
  brand: { event: string; year: string };
  nativeLabel: string;
  nativeName: string;
  persona: string;
  axisRight: string;
  axisLeft: string;
  weakLabel: string;
  bring: string;
  weakNames: string;
  weakList: string[];
  separator: string;
  footer: string;
  link: string;
  map: {
    terraces: Terrace[];
    labels: MapLabel[];
    routes: { d: string; start: [number, number] }[];
    node: string;
    rowTop: string;
    rowBottom: string;
  };
}

export function buildCardModel(content: Content, a: Analysis): CardModel {
  const ui = content.ui;
  const L = content.languages;
  const multi = a.weak.length > 1;
  return {
    brand: { event: ui.brand.event, year: ui.brand.year },
    nativeLabel: ui.share.nativeLabel,
    nativeName: L[a.native].name,
    persona: L[a.native].persona,
    axisRight: ui.map.axisRight,
    axisLeft: ui.map.axisLeft,
    weakLabel: multi ? ui.share.weakLabelMulti : ui.share.weakLabelSingle,
    bring: ui.share.bring,
    weakNames: joinNames(a.weak.map((k: Lang) => L[k].name), ui.listSeparator),
    weakList: a.weak.map((k: Lang) => L[k].name),
    separator: ui.listSeparator,
    footer: ui.share.footer,
    link: ui.share.link,
    map: {
      terraces: buildTerraces(content, 'result', a),
      labels: buildLabels(content, 'result', a),
      routes: buildRoutes(content, a).map((r) => ({ d: r.d, start: r.start })),
      node: ui.map.node,
      rowTop: ui.map.rowTop,
      rowBottom: ui.map.rowBottom,
    },
  };
}

/** All visible strings, for tests (term replacement must reach the card). */
export function cardStrings(m: CardModel): string[] {
  return [
    m.brand.event, m.brand.year, m.nativeLabel, m.nativeName, m.persona, m.axisRight, m.axisLeft,
    m.weakLabel, m.bring, m.weakNames, m.footer, m.link, m.map.node, m.map.rowTop, m.map.rowBottom,
    ...m.map.labels.flatMap((l) => [l.name, l.status ?? '']),
  ].filter(Boolean);
}

// ---------------------------------------------------------------- painter

type Ctx = CanvasRenderingContext2D;
type Align = 'left' | 'right' | 'center';

/** RLM marks keep neutral characters (+, ?, punctuation) on the RTL side even where ctx.direction is unsupported. */
const RLM = '‏';
const rtl = (s: string) => RLM + s + RLM;
const font = (weight: number, size: number) => `${weight} ${size}px Heebo, 'Assistant', system-ui, sans-serif`;

interface TextOpts {
  x: number;
  top: number;
  size: number;
  weight: number;
  lh: number;
  color: string;
  align: Align;
  shadow?: { color: string; blur: number; y?: number };
  /** Device pixels per layout pixel at this point (shadows are not scaled by the transform). */
  k: number;
  ltr?: boolean;
}

function baselineOf(ctx: Ctx, size: number, lh: number, text: string): number {
  const m = ctx.measureText(text);
  const asc = m.fontBoundingBoxAscent ?? size * 0.92;
  const desc = m.fontBoundingBoxDescent ?? size * 0.28;
  return (lh - (asc + desc)) / 2 + asc;
}

function text(ctx: Ctx, s: string, o: TextOpts): number {
  ctx.save();
  ctx.font = font(o.weight, o.size);
  ctx.textAlign = o.align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = o.color;
  if (o.shadow) {
    ctx.shadowColor = o.shadow.color;
    ctx.shadowBlur = o.shadow.blur * o.k;
    ctx.shadowOffsetY = (o.shadow.y ?? 0) * o.k;
  }
  const str = o.ltr ? s : rtl(s);
  ctx.fillText(str, o.x, o.top + baselineOf(ctx, o.size, o.lh, str));
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

function measure(ctx: Ctx, s: string, weight: number, size: number): number {
  ctx.save();
  ctx.font = font(weight, size);
  const w = ctx.measureText(rtl(s)).width;
  ctx.restore();
  return w;
}

/** Latin text with CSS-like letter-spacing, drawn glyph by glyph (ctx.letterSpacing is not universal). */
function spaced(ctx: Ctx, s: string, x: number, top: number, size: number, weight: number, lh: number, color: string, em: number) {
  ctx.save();
  ctx.font = font(weight, size);
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  const base = top + baselineOf(ctx, size, lh, s);
  let cx = x;
  for (const ch of s) {
    ctx.fillText(ch, cx, base);
    cx += ctx.measureText(ch).width + em * size;
  }
  ctx.restore();
}

function isoSquare(ctx: Ctx, cx: number, cy: number, draw: (half: number) => void) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.5);
  ctx.rotate(Math.PI / 4);
  draw(SQUARE / 2);
  ctx.restore();
}

function drawTerrace(ctx: Ctx, t: Terrace, k: number) {
  const [cx, cy] = t.center;
  for (const l of t.layers) {
    const y = cy + l.lift;
    if (t.look === 'missing') {
      isoSquare(ctx, cx, y, (h) => {
        ctx.setLineDash([4.5, 3]);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = C.soft;
        ctx.strokeRect(-h + 0.75, -h + 0.75, 2 * h - 1.5, 2 * h - 1.5);
      });
      continue;
    }
    const mag = t.look === 'native';
    const line = mag ? `rgba(250, 33, 141, ${l.alpha})` : `rgba(141, 176, 255, ${l.alpha})`;
    const fill = l.isTop
      ? (mag ? 'rgba(236, 42, 140, .42)' : 'rgba(42, 91, 235, .34)')
      : (mag ? 'rgba(236, 42, 140, .10)' : 'rgba(0, 68, 232, .08)');
    isoSquare(ctx, cx, y, (h) => {
      if (mag && l.isTop) {
        ctx.save();
        ctx.shadowColor = 'rgba(250, 33, 141, .55)';
        ctx.shadowBlur = 22 * k;
        ctx.strokeStyle = 'rgba(250, 33, 141, .55)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-h, -h, 2 * h, 2 * h);
        ctx.restore();
      }
      ctx.fillStyle = fill;
      ctx.fillRect(-h, -h, 2 * h, 2 * h);
      ctx.lineWidth = 1;
      ctx.strokeStyle = line;
      ctx.strokeRect(-h + 0.5, -h + 0.5, 2 * h - 1, 2 * h - 1);
    });
  }
}

function drawLabel(ctx: Ctx, l: MapLabel, bring: string, k: number) {
  const cx = l.x + LABEL.width / 2;
  const missing = l.look === 'missing';
  const native = l.look === 'native';
  const shadow = { color: 'rgba(0, 0, 44, .9)', blur: 10, y: 1 };
  const lines: { s: string; size: number; weight: number; color: string; shadow?: typeof shadow }[] = [
    { s: l.name, size: 17, weight: 800, color: native ? C.neon : C.white, shadow },
  ];
  if (l.status) lines.push({ s: l.status, size: 12.5, weight: 600, color: native || missing ? C.pale : C.sky, shadow });
  if (missing) lines.push({ s: bring, size: 12.5, weight: 700, color: C.pale });
  const pad = missing ? { x: 12, y: 5 } : { x: 0, y: 0 };
  const heights = lines.map((ln) => ln.size * 1.3);
  const innerH = heights.reduce((a, b) => a + b, 0) + (lines.length - 1);
  if (missing) {
    const w = Math.max(...lines.map((ln) => measure(ctx, ln.s, ln.weight, ln.size))) + pad.x * 2;
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = C.soft;
    ctx.strokeRect(cx - w / 2 + 0.5, l.y + 0.5, w - 1, innerH + pad.y * 2 - 1);
    ctx.restore();
  }
  let top = l.y + pad.y;
  lines.forEach((ln, i) => {
    text(ctx, ln.s, { x: cx, top, size: ln.size, weight: ln.weight, lh: heights[i], color: ln.color, align: 'center', shadow: ln.shadow, k });
    top += heights[i] + 1;
  });
}

/** The map in its own 342×344 space, final reveal state. `k` = device px per map px. */
export function drawMap(ctx: Ctx, m: CardModel['map'], bring: string, size: [number, number], node: [number, number], k: number) {
  const [W, H] = size;
  const [NX, NY] = node;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();

  // floor glow + iso grid
  const g = ctx.createRadialGradient(FLOOR.x + FLOOR.size / 2, FLOOR.y + FLOOR.size / 2, 0, FLOOR.x + FLOOR.size / 2, FLOOR.y + FLOOR.size / 2, FLOOR.size / 2);
  g.addColorStop(0, 'rgba(0, 68, 232, .42)');
  g.addColorStop(1, 'rgba(0, 68, 232, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.size, FLOOR.size);
  ctx.save();
  ctx.translate(FLOOR.x + FLOOR.size / 2, FLOOR.y + FLOOR.size / 2);
  ctx.scale(1, 0.5);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(141, 176, 255, .17)';
  const half = FLOOR.size / 2;
  for (let p = 0; p < FLOOR.size; p += FLOOR.cell) {
    ctx.fillRect(-half + p, -half, 1, FLOOR.size); // vertical lines (left → right)
    ctx.fillRect(-half, half - p - 1, FLOOR.size, 1); // horizontal lines (bottom → top)
  }
  ctx.restore();

  // vignette: ellipse 58% × 54% at 50% 57%
  ctx.save();
  const rx = 0.58 * W;
  const ry = 0.54 * H;
  ctx.translate(0.5 * W, 0.57 * H);
  ctx.scale(1, ry / rx);
  const v = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  v.addColorStop(0.5, 'rgba(0, 0, 44, 0)');
  v.addColorStop(1, C.night);
  ctx.fillStyle = v;
  ctx.fillRect(-W, -H * (rx / ry), 2 * W, 2 * H * (rx / ry));
  ctx.restore();

  // stars
  ctx.fillStyle = 'rgba(207, 224, 255, .6)';
  for (const [x, y, r] of STARS) {
    ctx.beginPath();
    ctx.arc(x + r / 2, y + r / 2, r / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const t of m.terraces) drawTerrace(ctx, t, k);

  // light routes
  for (const r of m.routes) {
    ctx.save();
    ctx.strokeStyle = C.neon;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(250, 33, 141, .85)';
    ctx.shadowBlur = 5 * k;
    ctx.stroke(new Path2D(r.d));
    ctx.beginPath();
    ctx.arc(r.start[0], r.start[1], 4.5, 0, Math.PI * 2);
    ctx.fillStyle = C.neon;
    ctx.fill();
    ctx.restore();
  }

  // integration node (magenta, final state)
  ctx.save();
  ctx.shadowColor = 'rgba(250, 33, 141, .6)';
  ctx.shadowBlur = 22 * k;
  ctx.beginPath();
  ctx.arc(NX, NY, 17, 0, Math.PI * 2);
  ctx.fillStyle = C.night;
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(NX, NY, 16.25, 0, Math.PI * 2);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = C.neon;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(NX, NY, 6, 0, Math.PI * 2);
  ctx.fillStyle = C.neon;
  ctx.fill();
  text(ctx, m.node, { x: NX, top: NY + 21, size: 12.5, weight: 400, lh: 18.75, color: C.sky, align: 'center', k });

  for (const l of m.labels) drawLabel(ctx, l, bring, k);

  // row labels (vertical-rl at the right edge)
  for (const [s, top] of [[m.rowTop, 70], [m.rowBottom, 196]] as const) {
    ctx.save();
    ctx.translate(W - 18.75 / 2, top);
    ctx.rotate(Math.PI / 2);
    ctx.font = font(400, 12.5);
    ctx.fillStyle = C.sky;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(rtl(s), measure(ctx, s, 400, 12.5), 0);
    ctx.restore();
  }
  ctx.restore();
}

export interface CardAssets {
  logo: CanvasImageSource;
  content: Content;
}

/** Paints the whole card. The canvas must be CARD_W×CARD_H × CARD_SCALE. */
export function paintCard(ctx: Ctx, model: CardModel, assets: CardAssets) {
  const k = CARD_SCALE;
  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const right = CARD_W - PAD;

  // header: logo at the right (RTL start), NEXUS / 2026 at the left
  ctx.drawImage(assets.logo, right - 34, 22 + 4, 34, 40);
  spaced(ctx, model.brand.event, PAD, 32, 14, 700, 14, C.whiteSoft, 0.14);
  spaced(ctx, model.brand.year, PAD, 48, 12, 600, 12, C.sky, 0.14);

  // Heebo's "normal" line height is 1.47em; the prototype card leaves most lines at normal.
  const N = 1.47;
  let y = 70 + 22;
  text(ctx, model.nativeLabel, { x: right, top: y, size: 14, weight: 600, lh: 14 * N, color: C.sky, align: 'right', k });
  y += 14 * N + 2;
  text(ctx, model.nativeName, {
    x: right, top: y, size: 60, weight: 900, lh: 60, color: C.magenta, align: 'right', k,
    shadow: { color: 'rgba(236, 42, 140, .45)', blur: 30 },
  });
  y += 60 + 6;
  text(ctx, model.persona, { x: right, top: y, size: 16, weight: 400, lh: 16 * N, color: C.whiteSoft, align: 'right', k });
  y += 16 * N + 10;

  // axis row + map (scaled .8, centred)
  text(ctx, model.axisRight, { x: right, top: y, size: 13, weight: 400, lh: 13 * N, color: C.sky, align: 'right', k });
  text(ctx, model.axisLeft, { x: PAD, top: y, size: 13, weight: 400, lh: 13 * N, color: C.sky, align: 'left', k });
  y += 13 * N + 10;
  const g = assets.content.map;
  const mapW = g.size[0] * MAP_SCALE;
  ctx.save();
  ctx.translate((CARD_W - mapW) / 2, y);
  ctx.scale(MAP_SCALE, MAP_SCALE);
  drawMap(ctx, model.map, model.bring, g.size, g.node, k * MAP_SCALE);
  ctx.restore();
  y += g.size[1] * MAP_SCALE + 10;

  // divider + weak language(s): labels baseline-aligned with the name (flex align-items: baseline)
  ctx.fillStyle = 'rgba(141, 176, 255, .3)';
  ctx.fillRect(PAD, y, CARD_W - 2 * PAD, 1);
  y += 1 + 14;
  const labelsW = Math.max(measure(ctx, model.weakLabel, 600, 13.5), measure(ctx, model.bring, 700, 12.5));
  const room = CARD_W - 2 * PAD - labelsW - 12;
  // One line from 26px down to 20px; beyond that, wrap by name at 22px.
  let nameSize = 26;
  while (nameSize > 20 && measure(ctx, model.weakNames, 900, nameSize) > room) nameSize -= 1;
  let nameLines = [model.weakNames];
  if (measure(ctx, model.weakNames, 900, nameSize) > room) {
    nameSize = 22;
    nameLines = [];
    let line = '';
    model.weakList.forEach((n, i) => {
      const piece = n + (i < model.weakList.length - 1 ? model.separator.trimEnd() : '');
      const next = line ? `${line} ${piece}` : piece;
      if (line && measure(ctx, next, 900, nameSize) > room) {
        nameLines.push(line);
        line = piece;
      } else line = next;
    });
    nameLines.push(line);
  }
  const nameLh = nameSize * N;
  ctx.font = font(900, nameSize);
  const baseline = y + baselineOf(ctx, nameSize, nameLh, nameLines[0]);
  nameLines.forEach((ln, i) =>
    text(ctx, ln, { x: PAD, top: y + i * nameLh, size: nameSize, weight: 900, lh: nameLh, color: C.white, align: 'left', k }));
  ctx.font = font(600, 13.5);
  const labelTop = baseline - baselineOf(ctx, 13.5, 13.5 * N, model.weakLabel);
  text(ctx, model.weakLabel, { x: right, top: labelTop, size: 13.5, weight: 600, lh: 13.5 * N, color: C.sky, align: 'right', k });
  const bringTop = labelTop + 13.5 * N + 2;
  text(ctx, model.bring, { x: right, top: bringTop, size: 12.5, weight: 700, lh: 12.5 * N, color: C.pale, align: 'right', k });
  const rowBottom = Math.max(y + nameLh * nameLines.length, bringTop + 12.5 * N);

  // footer: pushed to the bottom (flex-grow), or follows the content when it is taller
  const footLh = 14 * N;
  const borderY = Math.max(rowBottom, CARD_H - 24 - footLh - 12 - 1);
  ctx.fillStyle = 'rgba(141, 176, 255, .25)';
  ctx.fillRect(PAD, borderY, CARD_W - 2 * PAD, 1);
  const footTop = borderY + 1 + 12;
  text(ctx, model.footer, { x: right, top: footTop, size: 14, weight: 700, lh: footLh, color: C.white, align: 'right', k });
  text(ctx, model.link, { x: PAD, top: footTop + (footLh - 13 * N) / 2, size: 13, weight: 400, lh: 13 * N, color: C.sky, align: 'left', k });
  ctx.restore();
}
