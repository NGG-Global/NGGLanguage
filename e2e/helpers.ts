import { expect, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export const content = JSON.parse(readFileSync(new URL('../content/content.json', import.meta.url), 'utf8'));
const labelOf = (v: number): string => content.scale.find((s: { value: number }) => s.value === v).label;

export const SAMPLE = [5, 4, 3, 2, 5, 3, 4, 2, 3, 4, 2, 3]; // native C, weak P, M fluent, S partial

type L = 'C' | 'M' | 'S' | 'P';
/** Answer vector from three answers per language, in the fixed item order of content.json. */
export function answersFor(per: Record<L, number[]>): number[] {
  const seen: Record<L, number> = { C: 0, M: 0, S: 0, P: 0 };
  return content.items.map((it: { lang: L }) => per[it.lang][seen[it.lang]++]);
}

/** Opens the app with a controllable clock so every screen can be frozen deterministically. */
export async function open(page: Page, opts: { reducedMotion?: boolean; base?: string } = {}) {
  await page.emulateMedia({ reducedMotion: opts.reducedMotion ? 'reduce' : 'no-preference' });
  await page.clock.install({ time: new Date('2026-10-12T10:00:00') });
  await page.clock.pauseAt(new Date('2026-10-12T10:00:01'));
  await page.goto(opts.base ?? '/');
  await page.evaluate(() => document.fonts.ready);
}

/** Lets app timers advance by `ms`, then lets CSS transitions settle in real time. */
export async function advance(page: Page, ms: number, settleMs = 0) {
  await page.clock.runFor(ms);
  if (settleMs) await page.waitForTimeout(settleMs);
}

export async function passBoot(page: Page) {
  await advance(page, 8000);
  await page.locator('.boot__cta').click();
  await advance(page, 400);
  await expect(page.locator('.welcome')).toBeVisible();
}

export async function toFirstQuestion(page: Page) {
  await passBoot(page);
  await advance(page, 2000);
  await page.getByRole('button', { name: content.ui.welcome.cta }).click();
  await page.getByRole('button', { name: content.ui.frame.cta }).click();
  await expect(page.locator('.question')).toBeVisible();
  await advance(page, 100);
}

export async function answer(page: Page, values: number[]) {
  for (const v of values) {
    await page.getByRole('group').getByRole('button', { name: labelOf(v), exact: true }).click();
    await advance(page, 600);
    // React renders the next statement outside the fake clock; flush its entrance timer.
    await page.waitForTimeout(30);
    await advance(page, 60);
  }
}

export async function answerAll(page: Page, values: number[]) {
  await toFirstQuestion(page);
  await answer(page, values);
}

/** Result screen, fully revealed. */
export async function toResult(page: Page, values: number[], tieLang?: string) {
  await answerAll(page, values);
  if (tieLang) {
    await page.getByRole('button', { name: content.languages[tieLang].tiebreak }).click();
    await advance(page, 300);
  }
  await expect(page.locator('.calc')).toBeVisible();
  await advance(page, 2000);
  await expect(page.locator('.result')).toBeVisible();
  await advance(page, 3600, 1300);
}

export interface Diff {
  ratio: number;
  file: string;
}

/**
 * Screenshot vs reference (screens/*.png, @2x). Writes reference | ours | diff side by side
 * to e2e/__report__ for review and returns the mismatching pixel ratio.
 */
export async function compareToReference(page: Page, name: string, ref: string, fullPage = false): Promise<Diff> {
  mkdirSync('e2e/__report__', { recursive: true });
  const shot = PNG.sync.read(await page.screenshot({ fullPage, animations: 'disabled', caret: 'hide' }));
  const refPng = PNG.sync.read(readFileSync(`reference/screens/${ref}`));
  const w = Math.min(shot.width, refPng.width);
  const h = Math.min(shot.height, refPng.height);
  const crop = (src: PNG) => {
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(src, out, 0, 0, w, h, 0, 0);
    return out;
  };
  const a = crop(refPng);
  const b = crop(shot);
  const diff = new PNG({ width: w, height: h });
  const bad = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.2, includeAA: false });
  const H = Math.max(refPng.height, shot.height);
  const side = new PNG({ width: refPng.width + shot.width + w + 40, height: H });
  side.data.fill(40);
  PNG.bitblt(refPng, side, 0, 0, refPng.width, refPng.height, 0, 0);
  PNG.bitblt(shot, side, 0, 0, shot.width, shot.height, refPng.width + 20, 0);
  PNG.bitblt(diff, side, 0, 0, w, h, refPng.width + shot.width + 40, 0);
  const file = `e2e/__report__/${name}.png`;
  writeFileSync(file, PNG.sync.write(side));
  writeFileSync(`e2e/__report__/${name}-ours.png`, PNG.sync.write(shot));
  return { ratio: bad / (w * h), file };
}

/** No horizontal scroll and no clipped text inside the column. */
export async function layoutProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const doc = document.scrollingElement!;
    if (doc.scrollWidth > window.innerWidth + 1) problems.push(`horizontal scroll: ${doc.scrollWidth} > ${window.innerWidth}`);
    const col = document.querySelector('.app')!.getBoundingClientRect();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement!;
      if (!n.textContent!.trim() || el.closest('[aria-hidden="true"], .boot__bg, .visually-hidden')) continue;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width === 0) continue;
        if (r.left < col.left - 0.5 || r.right > col.right + 0.5) problems.push(`outside column: "${n.textContent!.trim().slice(0, 30)}" [${r.left.toFixed(0)}, ${r.right.toFixed(0)}]`);
      }
      // text cut by an overflow-clipping ancestor
      for (let p: HTMLElement | null = el; p && p !== document.body; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflowX !== 'visible' || ps.overflowY !== 'visible') {
          const pr = p.getBoundingClientRect();
          for (const r of range.getClientRects()) {
            if (r.width && (r.left < pr.left - 0.5 || r.right > pr.right + 0.5 || r.top < pr.top - 0.5 || r.bottom > pr.bottom + 0.5)) {
              if (!p.classList.contains('screen') && !p.classList.contains('app')) problems.push(`clipped by .${p.className.split(' ')[0]}: "${n.textContent!.trim().slice(0, 30)}"`);
            }
          }
          break;
        }
      }
    }
    return problems;
  });
}
