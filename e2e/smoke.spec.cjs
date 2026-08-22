const { test, expect } = require('@playwright/test');

const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';

test.describe('EWU StudyHub guest smoke', () => {
  test('homepage loads without page crash', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    expect(errors, `browser page errors: ${errors.join(' | ')}`).toEqual([]);
  });

  test('login page loads', async ({ page }) => {
    await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByText(/Continue with Google/i)).toBeVisible();
  });

  test('search route loads', async ({ page }) => {
    await page.goto(`${baseURL}/search`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
});
