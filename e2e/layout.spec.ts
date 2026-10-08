import { expect, test } from '@playwright/test';
import {
  advance, answer, answersFor, content, layoutProblems, open, passBoot, toFirstQuestion,
} from './helpers';

// 360–430px phones and a desktop column: no horizontal scroll, no clipped text, on every screen.
const SIZES = [
  { width: 360, height: 740 },
  { width: 430, height: 932 },
  { width: 1280, height: 800 },
];

for (const size of SIZES) {
  test.describe(`layout ${size.width}×${size.height}`, () => {
    test.use({ viewport: size });

    test('every screen', async ({ page }) => {
      const seen: Record<string, string[]> = {};
      const check = async (name: string) => { seen[name] = await layoutProblems(page); };
      await open(page);
      await advance(page, 8000, 100);
      await check('boot');
      await passBoot(page);
      await advance(page, 2500, 1500);
      await check('welcome');
      await page.getByRole('button', { name: content.ui.welcome.cta }).click();
      await advance(page, 400, 600);
      await check('frame');
      await page.getByRole('button', { name: content.ui.frame.cta }).click();
      await advance(page, 100, 400);
      // The longest statement must fit as well.
      const tie = answersFor({ C: [4, 4, 4], M: [4, 4, 4], S: [4, 4, 4], P: [2, 2, 2] });
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(450); // let the statement finish sliding in
        await check(`question ${i + 1}`);
        await answer(page, [tie[i]]);
      }
      await advance(page, 300, 700);
      await check('tie');
      await page.locator('.tieopt').first().click();
      await advance(page, 300, 300);
      await check('calc');
      await advance(page, 2000);
      await advance(page, 3600, 1200);
      await check('result');
      expect(seen).toEqual(Object.fromEntries(Object.keys(seen).map((k) => [k, []])));
    });

    test('long native names and three weak languages', async ({ page }) => {
      for (const [n, rest] of [['P', 'C'], ['M', 'S']] as const) {
        await open(page);
        const per = { C: [2, 2, 2], M: [2, 2, 2], S: [2, 2, 2], P: [2, 2, 2], [n]: [5, 5, 5] };
        await toFirstQuestion(page);
        await answer(page, answersFor(per as never));
        await advance(page, 2000);
        await advance(page, 3600, 1200);
        expect(await layoutProblems(page), `native ${n}, ${rest}`).toEqual([]);
      }
    });
  });
}

test('desktop: centred column', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page);
  await passBoot(page);
  const box = (await page.locator('.app').boundingBox())!;
  expect(box.width).toBe(430);
  expect(Math.round(box.x)).toBe(Math.round((1280 - 430) / 2));
});

// Real phones show less than 844px (Safari toolbars, iPhone SE). S1, S2, all twelve
// questions and the longest tie-break must fit without vertical scrolling, and every
// answer stays a comfortable tap target.
for (const size of [
  { width: 360, height: 740 },
  { width: 412, height: 780 },
  { width: 390, height: 664 },
  { width: 375, height: 667 },
  { width: 375, height: 548 },
]) {
  test.describe(`short screen ${size.width}×${size.height}`, () => {
    test.use({ viewport: size });

    test('S1, S2, every question and a four-way tie fit without scrolling', async ({ page }) => {
      const overflow = () => page.evaluate(() => document.scrollingElement!.scrollHeight - innerHeight);
      const seen: Record<string, number> = {};
      await open(page);
      await passBoot(page);
      await advance(page, 2500, 1500);
      seen.welcome = await overflow();
      await page.getByRole('button', { name: content.ui.welcome.cta }).click();
      await advance(page, 400, 600);
      seen.frame = await overflow();
      await page.getByRole('button', { name: content.ui.frame.cta }).click();
      await advance(page, 100, 400);
      for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(450);
        seen[`question ${i + 1}`] = await overflow();
        for (const h of await page.locator('.opt').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
          expect(h).toBeGreaterThanOrEqual(44);
        }
        await answer(page, [3]);
      }
      await advance(page, 300, 900);
      await expect(page.locator('.tieopt')).toHaveCount(4);
      seen.tie = await overflow();
      expect(seen).toEqual(Object.fromEntries(Object.keys(seen).map((k) => [k, 0])));
      expect(await layoutProblems(page)).toEqual([]);
    });
  });
}
