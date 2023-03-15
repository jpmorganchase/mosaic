import { test, expect } from '@playwright/test';

test('should navigate to the homepage', async ({ page }) => {
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto('/');
  // The new page should contain an h1 with "About Page"
  await expect(page.locator('h1')).toContainText('Mosaic');
});

test('should have a "Docs" link in the app header', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Docs' }).click();
  await expect(page.locator('h1')).toContainText('Getting started');
});

test('should have a "Quick Start" link in the app header', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Quick Start' }).click();
  await expect(page.locator('h1')).toContainText('Quick start guides');
});
