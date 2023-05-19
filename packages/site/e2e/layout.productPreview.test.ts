import { test, expect } from '@playwright/test';
import { waitForFonts } from './utils';

test('take a screenshot', async ({ page }) => {
  await page.goto('/mosaic/test/layouts/product-preview');
  await page.waitForFunction(waitForFonts);
  await expect(page).toHaveScreenshot('ProductPreview Layout.png', {
    fullPage: true
  });
});
