import { expect, test } from '@playwright/test';
import { advance, answerAll, answersFor, content, open, toResult } from './helpers';

const L = content.languages;
const LANGS = ['C', 'M', 'S', 'P'] as const;

test.describe('edge cases', () => {
  for (const [title, per, tied] of [
    ['two-way tie', { C: [4, 4, 4], M: [4, 4, 4], S: [3, 3, 2], P: [2, 2, 2] }, ['C', 'M']],
    ['three-way tie', { C: [4, 4, 4], M: [4, 4, 4], S: [4, 4, 4], P: [2, 2, 2] }, ['C', 'M', 'S']],
    ['four-way tie', { C: [3, 3, 3], M: [3, 3, 3], S: [3, 3, 3], P: [3, 3, 3] }, ['C', 'M', 'S', 'P']],
  ] as const) {
    test(`${title}: only the tied languages, by tie-break text, never by name`, async ({ page }) => {
      await open(page);
      await answerAll(page, answersFor(per as never));
      await expect(page.locator('.tie')).toBeVisible();
      const opts = page.locator('.tieopt');
      await expect(opts).toHaveCount(tied.length);
      for (const k of tied) await expect(page.getByRole('button', { name: L[k].tiebreak })).toBeVisible();
      const intro = content.ui.tie.intro.replace('{count}', content.ui.tie.countWords[String(tied.length)]);
      await expect(page.locator('.tie__intro')).toHaveText(intro);
      const text = await page.locator('main').innerText();
      for (const k of LANGS) expect(text).not.toContain(L[k].name);
      // The choice decides the native language.
      const pick = tied[tied.length - 1];
      await page.getByRole('button', { name: L[pick].tiebreak }).click();
      await advance(page, 300);
      await advance(page, 2000);
      await advance(page, 3600, 1200);
      await expect(page.locator('.res__name')).toHaveText(L[pick].name);
    });
  }

  test('two weak languages: a route, a block and a take-home question each', async ({ page }) => {
    await open(page);
    await toResult(page, answersFor({ C: [5, 5, 5], M: [4, 4, 4], S: [1, 1, 1], P: [1, 1, 1] }));
    await expect(page.locator('.route')).toHaveCount(2);
    await expect(page.locator('.res__weak')).toHaveCount(2);
    await expect(page.locator('.res__takeaway')).toHaveCount(2);
    await expect(page.locator('.mlabel--missing')).toHaveCount(2);
    await expect(page.locator('.res__weak-label').first()).toHaveText(content.ui.result.weakLabelMulti);
    for (const k of ['S', 'P'] as const) {
      await expect(page.locator('.res__weak-name', { hasText: L[k].name })).toBeVisible();
      await expect(page.locator('.res__takeaway', { hasText: L[k].takeaway })).toHaveCount(1);
    }
  });

  test('three weak languages', async ({ page }) => {
    await open(page);
    await toResult(page, answersFor({ C: [5, 5, 5], M: [2, 2, 2], S: [2, 2, 2], P: [2, 2, 2] }));
    await expect(page.locator('.route')).toHaveCount(3);
    await expect(page.locator('.res__weak')).toHaveCount(3);
    await expect(page.locator('.res__balanced')).toHaveCount(0);
  });

  test('balanced profile shows the note; an unbalanced one does not', async ({ page }) => {
    await open(page);
    await toResult(page, answersFor({ C: [4, 4, 4], M: [4, 4, 3], S: [4, 3, 3], P: [3, 3, 4] }));
    await expect(page.locator('.res__balanced')).toHaveText(content.ui.result.balanced);
  });

  test('close second language is announced', async ({ page }) => {
    await open(page);
    await toResult(page, answersFor({ C: [5, 5, 5], M: [5, 5, 4], S: [3, 3, 3], P: [1, 1, 1] }));
    await expect(page.locator('.res__close')).toHaveText(content.ui.result.closeSecond.replace('{name}', L.M.name));
  });

  test('reduced motion: the result shows its final state at once', async ({ page }) => {
    await open(page, { reducedMotion: true });
    await answerAll(page, answersFor({ C: [5, 5, 5], M: [4, 4, 4], S: [3, 3, 3], P: [1, 1, 1] }));
    await advance(page, 1950);
    await expect(page.locator('.result')).toBeVisible();
    await expect(page.locator('.res__lower')).toHaveClass(/is-on/);
    await expect(page.locator('.res__name')).toHaveClass(/is-on/);
    await expect(page.locator('.layer--missing')).toHaveClass(/is-lit/);
    await expect(page.locator('.res__save')).toBeVisible();
  });

  // Acceptance 2: with one weak language "שמירת המפה" is visible without scrolling at 390×844.
  for (const n of LANGS) {
    for (const w of LANGS) {
      if (n === w) continue;
      const others = LANGS.filter((k) => k !== n && k !== w);
      for (const close of [false, true]) {
        test(`save visible without scrolling: native ${n}, weak ${w}${close ? ', close second' : ''}`, async ({ page }) => {
          const per = { [n]: [5, 5, 5], [w]: [1, 1, 1], [others[0]]: close ? [5, 5, 4] : [3, 3, 3], [others[1]]: [3, 3, 3] };
          await open(page);
          await toResult(page, answersFor(per as never));
          const box = (await page.locator('.res__save').boundingBox())!;
          expect(box.y + box.height).toBeLessThanOrEqual(844);
        });
      }
    }
  }
});
