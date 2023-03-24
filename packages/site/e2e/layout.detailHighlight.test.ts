import { test } from '@playwright/test';

test('take a screenshot', async ({ page }) => {
  await page.goto('/mosaic/test/layouts/detail-highlight');
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: './e2e/screenshots/layout.detailHighlight.png', fullPage: true });
});
