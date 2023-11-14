import { test, expect } from '@playwright/test';

test('page can subscribe to tags ', async ({ page }) => {
  await page.goto('/mosaic/test/tags/index');
  await expect(page.getByRole('heading', { name: 'Tags Test' })).toBeVisible();
  await expect(page.getByText('Product A', { exact: true })).toBeVisible();
  await expect(page.getByText('Product B', { exact: true })).toBeVisible();
});
