import { test, expect, type Page } from '@playwright/test';

test.describe('GIVEN a page with the `DetailHighlight` Layout', () => {
  let page: Page;
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await page.goto('/mosaic/test/layouts/detail-highlight');
  });

  test.afterAll(async ({ browser }) => {
    browser.close();
  });

  test('THEN there is a header', async () => {
    await expect(page.locator('header')).toBeDefined();
  });

  test('THEN there are breadcrumbs ', async () => {
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toBeDefined();
    await expect(page.getByText('Breadcrumb 1')).toBeVisible();
    await expect(page.getByText('Breadcrumb 2')).toBeVisible();
    await expect(page.getByText('Breadcrumb 3')).toBeVisible();
  });

  test('THEN there is a table of contents', async () => {
    await expect(page.locator("ul[aria-label='Table of Contents']")).toBeDefined();
  });

  test('THEN there is a footer', async () => {
    await expect(page.locator('footer')).toBeDefined();
    await expect(page.getByText('Detail Highlight Layout Footer')).toBeVisible();
  });

  test('THEN there is **NO** sidebar', async () => {
    await expect(page.getByTestId('ps-sidebar-root-test-id')).toHaveCount(0);
  });

  test('THEN there is **NO** Doc Paginator', async () => {
    await expect(page.getByText('Previous Page')).toHaveCount(0);
    await expect(page.getByText('Next Page')).toHaveCount(0);
  });
});
