import { test, expect } from '@playwright/test';
import { waitForFonts } from './utils';

test('take a screenshot', async ({ page }) => {
  await page.goto('/mosaic/test/layouts/product-discover');
  await page.waitForFunction(waitForFonts);
  await expect(page).toHaveScreenshot('ProductDiscover Layout.png', {
    fullPage: true
  });
});
