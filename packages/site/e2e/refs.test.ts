import { test, expect } from '@playwright/test';

test('page can reference data in its own frontmatter', async ({ page }) => {
  await page.goto('/mosaic/test/refs/index');
  await expect(page.getByRole('heading', { name: 'Refs Test' })).toBeVisible();
  await expect(page.getByText('The sidebar priority is 3.', { exact: true })).toBeVisible();
});

test('page can reference data in another page', async ({ page }) => {
  await page.goto('/mosaic/test/refs/index');
  await expect(page.getByRole('heading', { name: 'Refs Test' })).toBeVisible();
  await expect(page.getByText('The other page data is 100.', { exact: true })).toBeVisible();
});
