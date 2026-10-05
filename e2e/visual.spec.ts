import { expect, test } from '@playwright/test';
import {
  SAMPLE, advance, answer, compareToReference, content, layoutProblems, open, passBoot, toFirstQuestion, toResult,
} from './helpers';

// Each screen vs its reference in screens/ (390×844 @2x). The threshold allows for
// font rasterisation and the twinkling stars; review e2e/__report__ for detail.
const MAX_DIFF = 0.015;

test.describe('screens match the reference', () => {
  test('S1 welcome', async ({ page }) => {
    await open(page);
    await passBoot(page);
    await advance(page, 2500, 1600);
    // The facts row and footnote under the map were removed on request (the CTA moved down),
    // so only the part above the CTA is compared with the reference.
    const d = await compareToReference(page, '02-S1-Welcome', '02-S1-Welcome.png', false, 660);
    expect(await layoutProblems(page)).toEqual([]);
    await expect(page.locator('.welcome__facts, .welcome__foot')).toHaveCount(0);
    const cta = (await page.locator('.welcome .btn').boundingBox())!;
    expect(cta.y + cta.height).toBeLessThanOrEqual(844 - 20);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('S2 frame', async ({ page }) => {
    await open(page);
    await passBoot(page);
    await page.getByRole('button', { name: content.ui.welcome.cta }).click();
    await advance(page, 600, 800);
    const d = await compareToReference(page, '03-S2-Frame', '03-S2-Frame.png');
    expect(await layoutProblems(page)).toEqual([]);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('S3 question before answering', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await advance(page, 400, 500);
    const d = await compareToReference(page, '04-S3-Question', '04-S3-Question.png');
    expect(await layoutProblems(page)).toEqual([]);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('S3 question 7 answered', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await answer(page, SAMPLE.slice(0, 6));
    await page.getByRole('group').getByRole('button', { name: content.scale[1].label, exact: true }).click();
    // Timers are frozen before the 260ms exit: selection shown, statement still in place.
    await advance(page, 120, 500);
    const d = await compareToReference(page, '05-S4-Answered', '05-S4-Answered.png');
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('S5 tie-break', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await answer(page, [4, 4, 3, 3, 4, 3, 4, 2, 2, 4, 2, 4]); // C 12 = M 12
    await advance(page, 600, 900);
    const d = await compareToReference(page, '06-S5-Tie', '06-S5-Tie.png');
    expect(await layoutProblems(page)).toEqual([]);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('S6 calc', async ({ page }) => {
    await open(page);
    await toFirstQuestion(page);
    await answer(page, SAMPLE);
    await advance(page, 1200, 1200);
    const d = await compareToReference(page, '07-S6-Calc', '07-S6-Calc.png');
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('R result, first fold', async ({ page }) => {
    await open(page);
    await toResult(page, SAMPLE);
    const d = await compareToReference(page, '08-R2-ResultFold', '08-R2-ResultFold.png');
    expect(await layoutProblems(page)).toEqual([]);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });

  test('R result, full page', async ({ page }) => {
    await open(page);
    await toResult(page, SAMPLE);
    const d = await compareToReference(page, '09-R1-ResultFull', '09-R1-ResultFull.png', true);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF * 1.5);
  });

  test('R result with two weak languages', async ({ page }) => {
    await open(page);
    await toResult(page, [5, 4, 2, 2, 5, 2, 4, 2, 2, 4, 2, 3]);
    const d = await compareToReference(page, '10-R4-ResultTwoMissing', '10-R4-ResultTwoMissing.png');
    expect(await layoutProblems(page)).toEqual([]);
    test.info().annotations.push({ type: 'diff', description: d.ratio.toFixed(4) });
    expect(d.ratio).toBeLessThan(MAX_DIFF);
  });
});
