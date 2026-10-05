import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { advance, content, layoutProblems, open } from './helpers';

test.describe('boot animation', () => {
  test('plays its scenes and ends on the title and CTA', async ({ page }) => {
    mkdirSync('e2e/__report__', { recursive: true });
    await open(page);
    let t = 0;
    for (const at of [0.44, 1.43, 2.23, 3.03, 4.03, 5.03, 7.43]) {
      await advance(page, (at - t) * 1000, 50);
      t = at;
      await page.screenshot({ path: `e2e/__report__/boot-${at.toFixed(2)}.png` });
    }
    await expect(page.getByRole('heading', { name: content.ui.boot.title })).toBeVisible();
    await expect(page.locator('.boot__counter')).toHaveText(`${content.ui.brand.event} ${content.ui.brand.year}`);
    expect(await layoutProblems(page)).toEqual([]);
  });

  test('a tap during the animation jumps to the final frame; the CTA leads to S1', async ({ page }) => {
    await open(page);
    await advance(page, 1000);
    const cta = page.locator('.boot__cta');
    await expect(cta).toHaveCSS('pointer-events', 'none');
    await page.mouse.click(195, 200);
    await advance(page, 100, 50);
    await expect(cta).toHaveCSS('opacity', '1');
    await cta.click();
    await advance(page, 400);
    await expect(page.locator('.welcome')).toBeVisible();
    await expect(page.locator('.boot')).toHaveCount(0);
  });

  test('reduced motion shows the final frame at once', async ({ page }) => {
    await open(page, { reducedMotion: true });
    await expect(page.locator('.boot__cta')).toHaveCSS('opacity', '1');
    await expect(page.locator('.boot__counter')).toHaveText(`${content.ui.brand.event} ${content.ui.brand.year}`);
  });

  test('ships no audio', async ({ page }) => {
    await open(page);
    await advance(page, 8000);
    expect(await page.locator('audio, video').count()).toBe(0);
  });
});
