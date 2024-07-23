import { test, expect } from '@playwright/test';

test.describe('GIVEN a page with the `DetailOverview` Layout', () => {
  test('THEN there is a header', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-overview');
    await expect(page.locator('header')).toBeDefined();
  });

  test('THEN there are breadcrumbs ', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-overview');
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toBeDefined();
    await expect(page.getByText('Breadcrumb 1')).toBeVisible();
    await expect(page.getByText('Breadcrumb 2')).toBeVisible();
    await expect(page.getByText('Breadcrumb 3')).toBeVisible();
  });

  test('THEN there is a footer', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-overview');
    await expect(page.locator('footer')).toBeDefined();
    await expect(page.getByText('Detail Overview Layout Footer')).toBeVisible();
  });

  test('THEN there is a sidebar', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-overview');
    const navigation = page.getByTestId('vertical-navigation');
    await expect(navigation).toBeVisible();
    await expect(navigation.locator(page.getByRole('link'))).toHaveCount(3);
    await expect(page.getByText('Test', { exact: true })).toBeVisible();
    await expect(navigation.locator(page.getByRole('button'))).toHaveCount(2);
    await expect(page.getByText('Layouts', { exact: true })).toBeVisible();
    await expect(page.getByText('Refs Test', { exact: true })).toBeVisible();
    await expect(page.getByText('Aliases Test', { exact: true })).toBeVisible();
    await expect(page.getByText('Tags Test', { exact: true })).toBeVisible();
  });

  test('THEN there is a Doc Paginator', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-overview');
    await expect(page.getByText('Previous Page')).toBeVisible();
    await expect(page.getByText('Next Page')).toBeVisible();
  });

  test('THEN there is **NO** table of contents', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-overview');
    await expect(page.locator("nav[data-testid='table-of-contents']")).toHaveCount(0);
  });
});
