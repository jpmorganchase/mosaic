import { test, expect } from '@playwright/test';

test.describe('GIVEN a page with the `FullWidth` Layout', () => {
  test('THEN there is a header', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/full-width');
    await expect(page.locator('header')).toBeDefined();
  });

  test('THEN there are **NO** breadcrumbs ', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/full-width');
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toHaveCount(0);
  });

  test('THEN there is **NO** footer', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/full-width');
    await expect(page.locator('footer')).toHaveCount(0);
  });

  test('THEN there is **NO** sidebar', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/full-width');
    await expect(page.getByTestId('ps-sidebar-root-test-id')).toHaveCount(0);
  });

  test('THEN there is **NO** Doc Paginator', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/full-width');
    await expect(page.getByText('Previous Page')).toHaveCount(0);
    await expect(page.getByText('Next Page')).toHaveCount(0);
  });

  test('THEN there is **NO** table of contents', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/full-width');
    await expect(page.locator("ul[aria-label='Table of Contents']")).toHaveCount(0);
  });
});
