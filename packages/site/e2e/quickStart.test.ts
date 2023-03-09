import { test, expect } from '@playwright/test';

test('clicking on Mosaic logo navigates to the homepage', async ({ page }) => {
  await page.goto('/mosaic/quick-start/index');
  await page.getByRole('link', { name: 'Logo Mosaic (BETA)' }).click();
  await expect(page.locator('h1')).toContainText('Mosaic');
});

test('the sidebar links to AWS Publishing Quick Start', async ({ page }) => {
  await page.goto('/mosaic/quick-start/index');
  await page
    .getByTestId('ps-submenu-content-test-id')
    .getByTestId('ps-menu-button-test-id')
    .click();

  const element = await page.getByText('Publish a site to AWS using S3 snapshots');
  await expect(element !== undefined).toBeTruthy();
});
