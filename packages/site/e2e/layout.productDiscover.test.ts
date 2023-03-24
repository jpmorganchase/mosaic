import { test, expect } from '@playwright/test';

test('take a screenshot', async ({ page }) => {
  await page.goto('/mosaic/test/layouts/product-discover');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.check('18px Open Sans'));
  await expect(page).toHaveScreenshot('ProductDiscover Layout.png', {
    fullPage: true
  });
});
