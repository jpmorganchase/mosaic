import { readFileSync } from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';

/**
 * Loads every page in the snapshot's sitemap, plus a missing page, and fails
 * on browser console errors, uncaught exceptions and runaway prefetching.
 *
 * Hydration errors only show in the console: React recovers by re-rendering
 * the page in the browser, so the page still looks right. Prefetch loops
 * don't show at all, apart from in the server's logs.
 */
const snapshotDir = process.env.MOSAIC_SNAPSHOT_DIR ?? 'snapshots/latest';
const sitemap = readFileSync(path.join(__dirname, '..', snapshotDir, 'sitemap.xml'), 'utf8');
const pages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, loc]) => new URL(loc).pathname);
const missingPage = '/mosaic/test/this-page-does-not-exist';

/** Console errors a page is expected to log, and why. */
const expectedErrors: Record<string, RegExp[]> = {
  // The fixture uses a layout that doesn't exist, to test the fallback.
  '/mosaic/test/layouts/edit': [/^Layout Edit is not supported, defaulting to FullWidth$/]
};

// A page prefetches each of its links once or twice.
const MAX_PREFETCHES = 50;

test.describe('Browser console', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Checked in Chromium only');

  test('the sitemap lists the pages to check', () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  for (const pathname of [...pages, missingPage]) {
    test(`${pathname} logs no errors and settles`, async ({ page }) => {
      const errors: string[] = [];
      let prefetches = 0;
      page.on('console', message => {
        // Failed requests are reported below, with their URLs.
        if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
          errors.push(message.text());
        }
      });
      page.on('response', response => {
        const url = new URL(response.url());
        if (response.status() >= 400 && url.pathname !== pathname) {
          errors.push(`${response.status()} ${url.pathname}${url.search}`);
        }
      });
      page.on('pageerror', error => errors.push(`Uncaught: ${error.message}`));
      page.on('request', request => {
        if (request.headers()['next-router-prefetch']) prefetches += 1;
      });

      const response = await page.goto(pathname, { waitUntil: 'load' });
      expect(response?.status()).toBe(pathname === missingPage ? 404 : 200);
      // Long enough for hydration, lazy components and viewport prefetches.
      await page.waitForTimeout(2000);

      const allowed = expectedErrors[pathname] ?? [];
      expect(errors.filter(error => !allowed.some(pattern => pattern.test(error)))).toEqual([]);
      expect(prefetches).toBeLessThanOrEqual(MAX_PREFETCHES);
    });
  }
});
