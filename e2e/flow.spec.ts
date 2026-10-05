import { expect, test } from '@playwright/test';
import { SAMPLE, advance, answer, content, open, passBoot, toFirstQuestion, toResult } from './helpers';

const names = Object.values(content.languages).map((l) => (l as { name: string }).name);
const label = (v: number) => content.scale.find((s: { value: number }) => s.value === v).label;
const opt = (page: import('@playwright/test').Page, v: number) =>
  page.getByRole('group').getByRole('button', { name: label(v), exact: true });

test.describe('flow and behaviour', () => {
  test('back: S2 → S1 without replaying the intro; Q1 → S2', async ({ page }) => {
    await open(page);
    await passBoot(page);
    await page.getByRole('button', { name: content.ui.welcome.cta }).click();
    await page.getByRole('button', { name: content.ui.frame.back }).click();
    await expect(page.locator('.welcome.no-entrance')).toBeVisible();
    await page.getByRole('button', { name: content.ui.welcome.cta }).click();
    await page.getByRole('button', { name: content.ui.frame.cta }).click();
    await page.getByRole('button', { name: content.ui.question.back }).click();
    await expect(page.locator('.frame')).toBeVisible();
  });

  test('answering: blue feedback, statement leaves right and the next enters from the left', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await opt(page, 4).click();
    await expect(opt(page, 4)).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(400);
    // Selection is electric blue (#2A5BEB), never magenta.
    await expect(page.locator('.opt.is-selected .opt__fill')).toHaveCSS('background-color', 'rgb(42, 91, 235)');
    await advance(page, 270);
    await expect(page.locator('.q__stmt')).toHaveClass(/is-out/);
    await expect(page.locator('.q__stmt')).toHaveCSS('transform', /matrix\(1, 0, 0, 1, 56, 0\)/);
    await advance(page, 260);
    await expect(page.locator('.q__counter')).toHaveText(content.ui.question.counter.replace('{n}', '2'));
    await expect(page.locator('.q__text')).toHaveText(content.items[1].text);
  });

  test('back returns to the previous statement with its answer marked', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await answer(page, [5, 2]);
    await page.getByRole('button', { name: content.ui.question.back }).click();
    await advance(page, 60);
    await expect(page.locator('.q__text')).toHaveText(content.items[1].text);
    await expect(opt(page, 2)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.q__stmt')).toHaveClass(/is-in|is-preBack/);
  });

  test('no hint of the language while answering', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    for (let i = 0; i < 12; i++) {
      // The statement itself may contain an ordinary word (e.g. "המערכות"); nothing around it may name a language.
      const chrome = await page.locator('main > :not(.q__stmt)').allInnerTexts();
      for (const n of names) expect(chrome.join(' ')).not.toContain(n);
      await expect(page.locator('.mlabel, .tmap')).toHaveCount(0);
      await expect(page.locator('main [style*="250, 33, 141"], main [style*="236, 42, 140"]')).toHaveCount(0);
      if (i < 11) await answer(page, [SAMPLE[i]]);
    }
  });

  test('S6 lasts 1.9s, then the result', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await answer(page, SAMPLE);
    await expect(page.locator('.calc')).toBeVisible();
    // S6 mounted ~60ms of fake time ago (see answer()); its timer fires at 1.9s.
    await advance(page, 1780);
    await expect(page.locator('.calc')).toBeVisible();
    await advance(page, 120);
    await expect(page.locator('.result')).toBeVisible();
  });

  test('result: native name, weak language named in map, block and aria-label; no numbers', async ({ page }) => {
    await open(page);
    await toResult(page, SAMPLE);
    const C = content.languages.C.name;
    const P = content.languages.P.name;
    await expect(page.locator('.res__name')).toHaveText(C);
    await expect(page.locator('.mlabel--missing')).toContainText(P);
    await expect(page.locator('.mlabel--missing')).toContainText(content.ui.map.status.missing);
    await expect(page.locator('.mlabel--missing')).toContainText(content.ui.result.bring);
    await expect(page.locator('.res__weak-label')).toHaveText(content.ui.result.weakLabelSingle);
    await expect(page.locator('.res__weak-name')).toHaveText(P);
    await expect(page.locator('.res__weak-text')).toHaveText(content.languages.P.weakText);
    await expect(page.locator('.tmap__box')).toHaveAttribute('role', 'img');
    const aria = await page.locator('.tmap__box').getAttribute('aria-label');
    expect(aria).toContain(C);
    expect(aria).toContain(P);
    await expect(page.locator('.route')).toHaveCount(1);
    await expect(page.locator('.res__disclaimer')).toHaveText(content.ui.result.disclaimer);
    // Level is shown by height, colour and label — never by a number.
    expect(await page.locator('.tmap, .res__weak').allInnerTexts()).not.toEqual(expect.arrayContaining([expect.stringMatching(/\d|%/)]));
  });

  test('restart needs a second tap within 3.2s and clears everything', async ({ page }) => {
    await open(page);
    await toResult(page, SAMPLE);
    const restart = page.getByRole('button', { name: content.ui.result.restart });
    await restart.click();
    const confirm = page.getByRole('button', { name: content.ui.result.restartConfirm });
    await expect(confirm).toBeVisible();
    await advance(page, 3300);
    await expect(page.getByRole('button', { name: content.ui.result.restart })).toBeVisible();
    await page.getByRole('button', { name: content.ui.result.restart }).click();
    await page.getByRole('button', { name: content.ui.result.restartConfirm }).click();
    await expect(page.locator('.welcome')).toBeVisible();
    await page.getByRole('button', { name: content.ui.welcome.cta }).click();
    await page.getByRole('button', { name: content.ui.frame.cta }).click();
    await expect(page.locator('.opt[aria-pressed="true"]')).toHaveCount(0);
    await expect(page.locator('.tick.is-done')).toHaveCount(0);
  });

  test('infinite loops pause while the tab is hidden', async ({ page }) => {
    await open(page);
    await passBoot(page);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('html')).toHaveAttribute('data-hidden', '');
    await expect(page.locator('.star').first()).toHaveCSS('animation-play-state', 'paused');
  });

  test('focus ring is 2px #FA218D with a 3px offset', async ({ page }) => {
    await open(page);
    await passBoot(page);
    await page.keyboard.press('Tab');
    const focused = page.locator('.btn:focus-visible');
    await expect(focused).toHaveCSS('outline-color', 'rgb(250, 33, 141)');
    await expect(focused).toHaveCSS('outline-width', '2px');
    await expect(focused).toHaveCSS('outline-offset', '3px');
  });

  test('tap targets: answers 56px, primary 58px, others ≥ 44px', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    for (const h of await page.locator('.opt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(h).toBe(56);
    const back = await page.locator('.q__back').boundingBox();
    expect(back!.height).toBeGreaterThanOrEqual(44);
    await answer(page, SAMPLE);
    await advance(page, 2000);
    await advance(page, 3600, 800);
    expect((await page.locator('.res__save').boundingBox())!.height).toBe(58);
    for (const b of await page.locator('.res__links > *').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
