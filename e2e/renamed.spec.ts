import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { SAMPLE, advance, answer, content, open, passBoot } from './helpers';

// Acceptance 5: renaming a language in content.json reaches every screen and the card.
// dist-renamed is built from e2e/.tmp/content-renamed.json (see e2e/make-renamed-content.mjs).
const renamed = JSON.parse(readFileSync(new URL('./.tmp/content-renamed.json', import.meta.url), 'utf8'));
const BASE = 'http://127.0.0.1:4174/';

test('renamed terms appear on every screen; the old ones nowhere', async ({ page }) => {
  const oldNames = ['C', 'M', 'S', 'P'].map((k) => content.languages[k].name);
  const newNames = ['C', 'M', 'S', 'P'].map((k) => renamed.languages[k].name);
  const assertNoOld = async () => {
    const text = await page.locator('body').innerText();
    for (const n of oldNames) expect(text).not.toContain(n);
  };

  await open(page, { base: BASE });
  await passBoot(page);
  await advance(page, 2500, 1500);
  for (const n of newNames) await expect(page.locator('.mlabel__name', { hasText: n })).toBeVisible();
  expect(await page.locator('.tmap__box').getAttribute('aria-label')).toContain(newNames[0]);
  await assertNoOld();

  await page.getByRole('button', { name: content.ui.welcome.cta }).click();
  await page.getByRole('button', { name: content.ui.frame.cta }).click();
  await advance(page, 100);
  await answer(page, SAMPLE);
  await expect(page.locator('.calc')).toBeVisible();
  for (const n of newNames) await expect(page.locator('.mlabel__name', { hasText: n })).toBeVisible();
  await advance(page, 2000);
  await advance(page, 3600, 1200);
  await expect(page.locator('.res__name')).toHaveText(renamed.languages.C.name);
  await expect(page.locator('.res__weak-name')).toHaveText(renamed.languages.P.name);
  await expect(page.locator('.mlabel--missing')).toContainText(renamed.languages.P.name);
  await assertNoOld();

  // The card is drawn from the same content (unit-tested in src/share/card.test.ts); the export still works.
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: renamed.ui.result.save }).click();
  const png = PNG.sync.read(readFileSync((await (await dl).path())!));
  expect([png.width, png.height]).toEqual([1080, 1920]);
});
