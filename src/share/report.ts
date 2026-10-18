// Results report (PDF): the full result screen laid out on A4 pages and drawn
// with Canvas 2D, in the same visual language as the screen and the share card.
// Every string comes from content.json.

import type { Content, Lang } from '../content/types';
import { fill } from '../content/format';
import type { Analysis } from '../logic';
import { buildCardModel, C, drawMap, font, measure, spaced, text, baselineOf, type Ctx } from './card';

/** A4 in points; drawing units are points, rendered at REPORT_SCALE px per point. */
export const PAGE: [number, number] = [595.28, 841.89];
export const REPORT_SCALE = 3;
const M = 44; // side margin
const TOP = 30;
const BOTTOM = 56; // room for the footer line
const N = 1.47; // Heebo's normal line height

/** The report's content in order. Pure: used by tests and by the painter. */
export function buildReportModel(content: Content, a: Analysis) {
  const ui = content.ui;
  const r = ui.result;
  const L = content.languages;
  const native = L[a.native];
  const multi = a.weak.length > 1;
  return {
    brand: ui.brand,
    nativeLabel: r.nativeLabel,
    nativeName: native.name,
    persona: native.persona,
    closeSecond: a.closeSecond ? fill(r.closeSecond, { name: L[a.closeSecond].name }) : null,
    axisRight: ui.map.axisRight,
    axisLeft: ui.map.axisLeft,
    map: buildCardModel(content, a).map,
    bring: r.bring,
    weak: a.weak.map((k: Lang) => ({ label: multi ? r.weakLabelMulti : r.weakLabelSingle, name: L[k].name, text: L[k].weakText })),
    message: r.message,
    deepLabel: r.deepLabel,
    nativeText: native.nativeText,
    priceLabel: r.priceLabel,
    price: native.price,
    takeaways: a.weak.map((k: Lang) => ({ label: r.takeawayLabel, text: L[k].takeaway })),
    balanced: a.balanced ? r.balanced : null,
    disclaimer: r.disclaimer,
    footer: ui.share.footer,
    link: ui.share.link,
    version: `${r.versionLabel} ${content.version}`,
  };
}
export type ReportModel = ReturnType<typeof buildReportModel>;

/** Greedy word wrap for RTL text at a given font. */
export function wrap(ctx: Ctx, s: string, weight: number, size: number, width: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && measure(ctx, next, weight, size) > width) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

interface Assets {
  logo: CanvasImageSource;
  content: Content;
  /** Creates a page canvas of PAGE × REPORT_SCALE pixels. */
  newCanvas: () => HTMLCanvasElement;
}

/** Lays out and paints the report; returns one canvas per page. */
export function paintReport(model: ReportModel, assets: Assets): HTMLCanvasElement[] {
  const [PW, PH] = PAGE;
  const k = REPORT_SCALE;
  const W = PW - 2 * M;
  const right = PW - M;
  const pages: HTMLCanvasElement[] = [];
  let ctx!: Ctx;
  let y = 0;

  const newPage = () => {
    const canvas = assets.newCanvas();
    pages.push(canvas);
    ctx = canvas.getContext('2d')!;
    try {
      (ctx as Ctx & { direction?: string }).direction = 'rtl';
    } catch {
      /* RLM marks cover browsers without ctx.direction */
    }
    ctx.scale(k, k);
    ctx.fillStyle = C.night;
    ctx.fillRect(0, 0, PW, PH);
    // header: logo at the right (RTL start), event / year (ui.brand) at the left
    ctx.drawImage(assets.logo, right - 34, TOP, 34, 40);
    spaced(ctx, model.brand.event, M, TOP + 6, 14, 700, 14, C.whiteSoft, 0.14);
    spaced(ctx, model.brand.year, M, TOP + 22, 12, 600, 12, C.sky, 0.14);
    y = TOP + 40 + 26;
  };
  /** Starts a new page when `h` points no longer fit. */
  const ensure = (h: number) => {
    if (y + h > PH - BOTTOM) newPage();
  };
  const line = (s: string, size: number, weight: number, color: string, lh = size * N, align: 'right' | 'center' = 'right') => {
    ensure(lh);
    text(ctx, s, { x: align === 'right' ? right : PW / 2, top: y, size, weight, lh, color, align, k });
    y += lh;
  };
  const para = (s: string, size: number, weight: number, color: string, lh: number, width = W) => {
    for (const ln of wrap(ctx, s, weight, size, width)) line(ln, size, weight, color, lh);
  };
  const divider = (gap: number) => {
    ensure(gap + 1);
    y += gap;
    ctx.fillStyle = 'rgba(141, 176, 255, .3)';
    ctx.fillRect(M, y, W, 1);
    y += 1;
  };
  /** Rounded panel behind a block of wrapped text (price, balanced note). */
  const panel = (label: { s: string; color: string } | null, body: string, bg: string, bodySize: number, bodyColor: string) => {
    const pad = 14;
    const lines = wrap(ctx, body, 400, bodySize, W - 2 * pad);
    const labelH = label ? 13 * N + 4 : 0;
    const bodyLh = bodySize * 1.55;
    const h = pad * 2 + labelH + lines.length * bodyLh;
    ensure(h);
    ctx.fillStyle = bg;
    ctx.beginPath();
    // roundRect is missing before iOS 16; a square panel is an acceptable fallback.
    if (typeof ctx.roundRect === 'function') ctx.roundRect(M, y, W, h, 4);
    else ctx.rect(M, y, W, h);
    ctx.fill();
    let ty = y + pad;
    if (label) {
      text(ctx, label.s, { x: right - pad, top: ty, size: 13, weight: 700, lh: 13 * N, color: label.color, align: 'right', k });
      ty += labelH;
    }
    for (const ln of lines) {
      text(ctx, ln, { x: right - pad, top: ty, size: bodySize, weight: 400, lh: bodyLh, color: bodyColor, align: 'right', k });
      ty += bodyLh;
    }
    y += h;
  };

  newPage();

  // native language
  line(model.nativeLabel, 15, 600, C.sky);
  y += 2;
  ensure(64);
  text(ctx, model.nativeName, {
    x: right, top: y, size: 64, weight: 900, lh: 64, color: C.magenta, align: 'right', k,
    shadow: { color: 'rgba(236, 42, 140, .45)', blur: 30 },
  });
  y += 64 + 8;
  line(model.persona, 18, 400, C.whiteSoft);
  if (model.closeSecond) line(model.closeSecond, 14, 400, C.pale);

  // map with its axis row
  const g = assets.content.map;
  ensure(13 * N + 10 + g.size[1]);
  y += 12;
  text(ctx, model.axisRight, { x: right, top: y, size: 13, weight: 400, lh: 13 * N, color: C.sky, align: 'right', k });
  text(ctx, model.axisLeft, { x: M, top: y, size: 13, weight: 400, lh: 13 * N, color: C.sky, align: 'left', k });
  y += 13 * N + 10;
  ctx.save();
  ctx.translate((PW - g.size[0]) / 2, y);
  drawMap(ctx, model.map, model.bring, g.size, g.node, k);
  ctx.restore();
  y += g.size[1];

  // weak language(s): labels baseline-aligned with the name, as on screen
  divider(8);
  for (const w of model.weak) {
    const textLines = wrap(ctx, w.text, 400, 16.5, W);
    ensure(14 + 30 * 1.2 + 8 + Math.min(2, textLines.length) * 16.5 * 1.6);
    y += 14;
    const nameLh = 30 * 1.2;
    ctx.font = font(900, 30);
    const baseline = y + baselineOf(ctx, 30, nameLh, w.name);
    text(ctx, w.name, { x: M, top: y, size: 30, weight: 900, lh: nameLh, color: C.white, align: 'left', k });
    ctx.font = font(600, 14);
    const labelTop = baseline - baselineOf(ctx, 14, 14 * N, w.label);
    text(ctx, w.label, { x: right, top: labelTop, size: 14, weight: 600, lh: 14 * N, color: C.sky, align: 'right', k });
    text(ctx, model.bring, { x: right, top: labelTop + 14 * N + 2, size: 13, weight: 700, lh: 13 * N, color: C.pale, align: 'right', k });
    y = Math.max(y + nameLh, labelTop + 14 * N + 2 + 13 * N) + 8;
    para(w.text, 16.5, 400, C.whiteSoft, 16.5 * 1.6);
  }

  // closing message
  y += 18;
  for (const m of model.message) line(m, 15, 400, C.sky, 15 * 1.55, 'center');

  // native language in depth
  divider(28);
  y += 20;
  line(model.deepLabel, 14, 600, C.sky);
  y += 6;
  para(model.nativeText, 16.5, 400, C.whiteSoft, 16.5 * 1.6);
  y += 16;
  panel({ s: model.priceLabel, color: C.soft }, model.price, 'rgba(17, 17, 90, .6)', 15.5, C.mist);

  for (const t of model.takeaways) {
    y += 22;
    ensure(14 * N + 6 + 22 * 1.4);
    line(t.label, 14, 600, C.sky);
    y += 6;
    para(t.text, 22, 800, C.white, 22 * 1.4);
  }
  if (model.balanced) {
    y += 22;
    panel(null, model.balanced, 'rgba(17, 17, 90, .8)', 15, C.mist);
  }
  y += 26;
  ctx.globalAlpha = 0.82;
  para(model.disclaimer, 13.5, 400, C.mist, 13.5 * 1.6);
  ctx.globalAlpha = 1;

  // footer on every page: tool name, short link, content version
  pages.forEach((canvas) => {
    const c = canvas.getContext('2d')!;
    const fy = PH - BOTTOM + 14;
    c.fillStyle = 'rgba(141, 176, 255, .25)';
    c.fillRect(M, fy, W, 1);
    const lh = 13 * N;
    text(c, model.footer, { x: right, top: fy + 10, size: 13, weight: 700, lh, color: C.white, align: 'right', k });
    const footW = measure(c, model.footer, 700, 13);
    text(c, model.link, { x: right - footW - 12, top: fy + 10, size: 12, weight: 400, lh, color: C.sky, align: 'right', k });
    text(c, model.version, { x: M, top: fy + 10, size: 11, weight: 400, lh, color: C.sky, align: 'left', k, ltr: false });
  });
  return pages;
}

/** All visible strings, for tests (term replacement must reach the PDF). */
export function reportStrings(m: ReportModel): string[] {
  return [
    m.nativeLabel, m.nativeName, m.persona, m.closeSecond ?? '', m.axisRight, m.axisLeft, m.bring,
    ...m.weak.flatMap((w) => [w.label, w.name, w.text]), ...m.message, m.deepLabel, m.nativeText,
    m.priceLabel, m.price, ...m.takeaways.flatMap((t) => [t.label, t.text]), m.balanced ?? '',
    m.disclaimer, m.footer, m.link, m.version, ...m.map.labels.map((l) => l.name),
  ].filter(Boolean);
}

