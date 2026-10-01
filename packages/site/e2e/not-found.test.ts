import { test, expect } from '@playwright/test';

/**
 * A missing page inside a namespace renders `[namespace]/not-found.tsx`
 * within the namespace layout, so it keeps the site header. (A static
 * export serves the global `404.html` instead, which has no namespace.)
 */
test('a missing page in a namespace returns 404 with the site header', async ({ page }) => {
  const response = await page.goto('/mosaic/test/this-page-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByText('Page Not Found')).toBeVisible();
  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.locator('header').getByRole('link', { name: 'Configure' })).toBeVisible();
});
