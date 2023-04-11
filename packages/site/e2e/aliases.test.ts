import { test, expect } from '@playwright/test';

test('page is accessible via normal route', async ({ page }) => {
  await page.goto('/mosaic/test/aliases/index');
  await expect(page.getByRole('heading', { name: 'Aliases Test' })).toBeVisible();
});

test('page is accessible via the page alias', async ({ page }) => {
  await page.goto('/mosaic/test/example');
  await expect(page.getByRole('heading', { name: 'Aliases Test' })).toBeVisible();
});

test('and multiple aliases are supported', async ({ page }) => {
  await page.goto('/mosaic/another/example');
  await expect(page.getByRole('heading', { name: 'Aliases Test' })).toBeVisible();
});
