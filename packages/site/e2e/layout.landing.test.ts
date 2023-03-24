import { test, expect } from '@playwright/test';

test('take a screenshot', async ({ page }) => {
  await page.goto('/mosaic/test/layouts/landing');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.fonts.check('18px Open Sans'));
  await expect(page).toHaveScreenshot('Landing Layout.png', {
    fullPage: true
  });
});
