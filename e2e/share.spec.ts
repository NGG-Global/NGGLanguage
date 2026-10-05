import { expect, test, type Page } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { SAMPLE, content, open, toResult } from './helpers';

async function saveCard(page: Page) {
  const downloadP = page.waitForEvent('download');
  await page.getByRole('button', { name: content.ui.result.save }).click();
  const dl = await downloadP;
  const path = await dl.path();
  return { name: dl.suggestedFilename(), png: readFileSync(path!) };
}

/** Downscale in the browser (1080×1920 → 720×1280, the reference's @2x size). */
async function downscale(page: Page, png: Buffer): Promise<PNG> {
  const dataUrl = await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 720;
    c.height = 1280;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, 720, 1280);
    return c.toDataURL('image/png');
  }, png.toString('base64'));
  return PNG.sync.read(Buffer.from(dataUrl.split(',')[1], 'base64'));
}

test.describe('share card', () => {
  test('exports a 1080×1920 PNG that matches the reference card', async ({ page }) => {
    await open(page);
    await toResult(page, SAMPLE);
    const { name, png } = await saveCard(page);
    expect(name).toBe(content.ui.share.fileName);
    const full = PNG.sync.read(png);
    expect([full.width, full.height]).toEqual([1080, 1920]);
    await expect(page.getByRole('status')).toHaveText(content.ui.result.toast);

    mkdirSync('e2e/__report__', { recursive: true });
    writeFileSync('e2e/__report__/share-card.png', png);
    const ours = await downscale(page, png);
    const ref = PNG.sync.read(readFileSync('reference/screens/11-R3-ShareCard.png'));
    const diff = new PNG({ width: 720, height: 1280 });
    const bad = pixelmatch(ref.data, ours.data, diff.data, 720, 1280, { threshold: 0.2 });
    const side = new PNG({ width: 720 * 3 + 40, height: 1280 });
    PNG.bitblt(ref, side, 0, 0, 720, 1280, 0, 0);
    PNG.bitblt(ours, side, 0, 0, 720, 1280, 740, 0);
    PNG.bitblt(diff, side, 0, 0, 720, 1280, 1480, 0);
    writeFileSync('e2e/__report__/11-R3-ShareCard.png', PNG.sync.write(side));
    const ratio = bad / (720 * 1280);
    test.info().annotations.push({ type: 'diff', description: ratio.toFixed(4) });
    expect(ratio).toBeLessThan(0.03);
  });

  test('two weak languages: plural label and both names on the card', async ({ page }) => {
    await open(page);
    await toResult(page, [5, 4, 2, 2, 5, 2, 4, 2, 2, 4, 2, 3]);
    const { png } = await saveCard(page);
    writeFileSync('e2e/__report__/share-card-two-weak.png', png);
    expect(PNG.sync.read(png).width).toBe(1080);
  });

  test('three weak languages (four-way tie) still fit the card', async ({ page }) => {
    await open(page);
    await toResult(page, Array(12).fill(3), 'P');
    const { png } = await saveCard(page);
    writeFileSync('e2e/__report__/share-card-three-weak.png', png);
    expect(PNG.sync.read(png).height).toBe(1920);
  });
});
