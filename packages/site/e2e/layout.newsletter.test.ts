import { test, expect } from '@playwright/test';

test.describe('GIVEN a page with the `Newsletter` Layout', () => {
  test('THEN there is a header', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/newsletter');
    await expect(page.locator('header')).toBeDefined();
  });

  test('THEN there are **NO** breadcrumbs ', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/newsletter');
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toHaveCount(0);
  });

  test('THEN there is a footer', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/newsletter');
    await expect(page.locator('footer')).toBeDefined();
    await expect(page.getByText('Newsletter Layout Footer')).toBeVisible();
  });

  test('THEN there is **NO** sidebar', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/newsletter');
    await expect(page.getByTestId('vertical-navigation')).toHaveCount(0);
  });

  test('THEN there is a Doc Paginator', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/newsletter');
    await expect(page.getByText('Previous Post')).toBeVisible();
    await expect(page.getByText('Next Post')).toBeVisible();
  });

  test('THEN there is **NO** table of contents', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/newsletter');
    await expect(page.locator("nav[data-testid='table-of-contents']")).toHaveCount(0);
  });
});
