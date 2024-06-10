import { test, expect } from '@playwright/test';

test.describe('GIVEN a page with the `ProductDiscover` Layout', () => {
  test('THEN there is a header', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/product-discover');
    await expect(page.locator('header')).toBeDefined();
  });

  test('THEN there are breadcrumbs ', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/product-discover');
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toBeDefined();
    await expect(page.getByText('Breadcrumb 1')).toBeVisible();
    await expect(page.getByText('Breadcrumb 2')).toBeVisible();
    await expect(page.getByText('Breadcrumb 3')).toBeVisible();
  });

  test('THEN there is a footer', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/product-discover');
    await expect(page.locator('footer')).toBeDefined();
    await expect(page.getByText('Product Discover Layout Footer')).toBeVisible();
  });

  test('THEN there is **NO** sidebar', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/product-discover');
    await expect(page.getByTestId('vertical-navigation')).toHaveCount(0);
  });

  test('THEN there is **NO** Doc Paginator', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/product-discover');
    await expect(page.getByText('Previous Page')).toHaveCount(0);
    await expect(page.getByText('Next Page')).toHaveCount(0);
  });

  test('THEN there is **NO** table of contents', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/product-discover');
    await expect(page.locator("nav[data-testid='table-of-contents']")).toHaveCount(0);
  });
});
