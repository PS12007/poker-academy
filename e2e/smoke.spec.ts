import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (e) => {
    throw e;
  });
});

test('home renders and computes the specimen', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('derived');
  // The exact AA v KK enumeration finishes and prints its board count.
  await expect(page.getByText('1,712,304 boards')).toBeVisible({ timeout: 20_000 });
});

test('a lesson quiz can be completed and marks the lesson done', async ({ page }) => {
  await page.goto('./#/learn/m1/what-poker-is');
  const quiz = page.locator('#quiz');
  await expect(quiz).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const finish = quiz.getByRole('button', { name: 'Finish' });
    const next = quiz.getByRole('button', { name: 'Next question' });
    if (!(await finish.isVisible()) && !(await next.isVisible())) break;
    await quiz.getByRole('radio').first().click();
    if (await finish.isVisible()) {
      await finish.click();
      break;
    }
    await next.click();
  }
  await expect(quiz.getByRole('button', { name: 'Take it again' })).toBeVisible();
  await page.goto('./#/course');
  await expect(page.getByText(/1 of \d+ available lessons complete/)).toBeVisible();
});

test('the equity calculator runs', async ({ page }) => {
  await page.goto('./#/tools/equity');
  await page.getByRole('button', { name: 'Compute equity' }).click();
  await expect(page.getByText(/Monte Carlo · [\d,]+ trials · seed 1|exact · [\d,]+ showdowns/)).toBeVisible({ timeout: 30_000 });
});

test('a drill round can be played', async ({ page }) => {
  await page.goto('./#/drills/pot-odds');
  await page.getByRole('button', { name: 'Call' }).click();
  await expect(page.getByRole('button', { name: 'Next round' })).toBeVisible();
  await page.getByRole('button', { name: 'Next round' }).click();
  await expect(page.getByText('1/1').or(page.getByText('0/1'))).toBeVisible();
});

test('search opens with the slash key and finds a lesson', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('button', { name: 'Search the site' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Search' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('pot odds');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/(learn|tools|reference)/);
});
