import { expect, test } from '@playwright/test';
import { SAMPLE, content, open, toResult } from './helpers';

test.describe('privacy', () => {
  test('no network request after load, through the whole flow and the export', async ({ page }) => {
    const late: string[] = [];
    let loaded = false;
    page.on('load', () => { loaded = true; });
    page.on('request', (r) => {
      const u = r.url();
      if (loaded && !u.startsWith('blob:') && !u.startsWith('data:')) late.push(u);
    });
    await open(page);
    await page.waitForLoadState('networkidle');
    await toResult(page, SAMPLE);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: content.ui.result.save }).click();
    await dl;
    expect(late).toEqual([]);
  });

  test('nothing is stored in the browser', async ({ page, context }) => {
    await open(page);
    await toResult(page, SAMPLE);
    const dl = page.waitForEvent('download');
    await page.getByRole('button', { name: content.ui.result.save }).click();
    await dl;
    const stored = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
      idb: indexedDB.databases ? (await indexedDB.databases()).length : 0,
      caches: 'caches' in window ? (await caches.keys()).length : 0,
      sw: navigator.serviceWorker ? (await navigator.serviceWorker.getRegistrations()).length : 0,
    }));
    expect(stored).toEqual({ local: 0, session: 0, cookie: '', idb: 0, caches: 0, sw: 0 });
    expect(await context.cookies()).toEqual([]);
  });

  test('the production page forbids connections (CSP connect-src none)', async ({ page }) => {
    await open(page);
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');
    expect(csp).toContain("connect-src 'none'");
    const blocked = await page.evaluate(() => fetch('/content.json').then(() => false, () => true));
    expect(blocked).toBe(true);
  });
});
