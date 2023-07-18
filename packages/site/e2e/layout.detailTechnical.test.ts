import { test, expect } from '@playwright/test';

test.describe('GIVEN a page with the `DetailTechnical` Layout', () => {
  test('THEN there is a header', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-technical');
    await expect(page.locator('header')).toBeDefined();
  });

  test('THEN there are breadcrumbs ', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-technical');
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toBeDefined();
    await expect(page.getByText('Breadcrumb 1')).toBeVisible();
    await expect(page.getByText('Breadcrumb 2')).toBeVisible();
    await expect(page.getByText('Breadcrumb 3')).toBeVisible();
  });

  test('THEN there is a footer', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-technical');
    await expect(page.locator('footer')).toBeDefined();
    await expect(page.getByText('Detail Technical Layout Footer')).toBeVisible();
  });

  test('THEN there is a sidebar', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-technical');
    await expect(page.getByTestId('ps-sidebar-root-test-id')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Test', exact: true })).toBeVisible();
    // await expect(page.getByRole('link', { name: 'Layouts', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Refs Test' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Aliases Test', exact: true })).toBeVisible();
  });

  test('THEN there is a Doc Paginator', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-technical');
    await expect(page.getByText('Previous Page')).toBeVisible();
    await expect(page.getByText('Next Page')).toBeVisible();
  });

  test('THEN there is a table of contents', async ({ page }) => {
    await page.goto('/mosaic/test/layouts/detail-technical');
    await expect(page.locator("ul[aria-label='Table of contents']")).toBeVisible();
  });
});
