// Client-side exports: the share card (PNG 1080×1920) and the full results
// report (PDF, A4). Then the system share sheet (Web Share API with files) on
// touch devices, or a plain download. No server, no network: canvas → Blob → File.

import { content } from '../content';
import type { Analysis } from '../logic';
import { CARD_H, CARD_SCALE, CARD_W, buildCardModel, paintCard } from './card';
import { PAGE, REPORT_SCALE, buildReportModel, paintReport } from './report';
import { buildPdf } from './pdf';

export interface PreparedFile {
  blob: Blob;
  file: File;
}
/** @deprecated name kept for the PNG card; same shape as PreparedFile. */
export type PreparedCard = PreparedFile;

export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled';

const logoSrc = `${import.meta.env.BASE_URL}assets/ngg-logo-color.png`;

/** Reuses the header logo already on screen, so exporting makes no request at all. */
async function loadLogo(): Promise<HTMLImageElement> {
  const onScreen = document.querySelector<HTMLImageElement>('.hdr__logo');
  if (onScreen?.complete && onScreen.naturalWidth) return onScreen;
  const img = new Image();
  img.src = logoSrc;
  await img.decode();
  return img;
}

/** Canvas text needs the web font loaded; otherwise it silently falls back. */
async function ensureFonts(): Promise<void> {
  if (!document.fonts) return;
  await Promise.all([
    document.fonts.load("400 16px Heebo", 'אבג'),
    document.fonts.load("900 16px Heebo", 'אבג'),
    document.fonts.load("700 16px Heebo", 'NEXUS 2026'),
  ]);
  await document.fonts.ready;
}

export async function renderCardBlob(analysis: Analysis): Promise<Blob> {
  const [logo] = await Promise.all([loadLogo(), ensureFonts()]);
  const canvas = document.createElement('canvas');
  canvas.width = CARD_W * CARD_SCALE;
  canvas.height = CARD_H * CARD_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d unavailable');
  try {
    (ctx as CanvasRenderingContext2D & { direction?: string }).direction = 'rtl';
  } catch {
    /* RLM marks in card.ts cover browsers without ctx.direction */
  }
  paintCard(ctx, buildCardModel(content, analysis), { logo, content });
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

export async function prepareCard(analysis: Analysis): Promise<PreparedCard> {
  const blob = await renderCardBlob(analysis);
  return { blob, file: new File([blob], content.ui.share.fileName, { type: 'image/png' }) };
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality));

/** Full results as an A4 PDF: pages drawn on canvas, embedded as JPEG. */
export async function preparePdf(analysis: Analysis): Promise<PreparedFile> {
  const [logo] = await Promise.all([loadLogo(), ensureFonts()]);
  const newCanvas = () => {
    const c = document.createElement('canvas');
    c.width = Math.round(PAGE[0] * REPORT_SCALE);
    c.height = Math.round(PAGE[1] * REPORT_SCALE);
    return c;
  };
  const canvases = paintReport(buildReportModel(content, analysis), { logo, content, newCanvas });
  const pages = [];
  for (const c of canvases) {
    const jpeg = new Uint8Array(await (await toBlob(c, 'image/jpeg', 0.9)).arrayBuffer());
    pages.push({ jpeg, px: [c.width, c.height] as [number, number] });
    c.width = 0; // release the bitmap early (matters on iOS)
  }
  const bytes = buildPdf(pages, PAGE, content.ui.share.shareTitle);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  return { blob, file: new File([blob], content.ui.share.pdfFileName, { type: 'application/pdf' }) };
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const touchDevice = () => typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;

export async function saveFile(prepared: Promise<PreparedFile>): Promise<SaveOutcome> {
  const { blob, file } = await prepared;
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (touchDevice() && nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: content.ui.share.shareTitle });
      return 'shared';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'cancelled';
      // NotAllowedError (gesture expired) or unsupported type: fall back to a download.
    }
  }
  download(blob, file.name);
  return 'downloaded';
}

export const saveCard = saveFile;
