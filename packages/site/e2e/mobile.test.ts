import { test, expect, type Page } from '@playwright/test';

/**
 * Narrow screens. Below the tablet breakpoint the header's tabs and the
 * page's sidebar move into drawers. The other suites run 2048px wide, so
 * nothing else covers them.
 */
test.use({ viewport: { width: 390, height: 844 } });

/** Load a page and wait for hydration (`ThemeProvider` then drops `mosaic-ssr`). */
async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('.mosaic-ssr')).toHaveCount(0);
}

test.describe('On a narrow screen', () => {
  test('the header menu opens, follows a link and closes', async ({ page }) => {
    await gotoHydrated(page, '/mosaic/author/index');

    await page.getByRole('button', { name: 'show the tab navigation' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    // Tapping the icon used to close the drawer again straight away; its
    // closing animation takes 300ms, so check it is still open after that.
    await page.waitForTimeout(1000);
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Configure', exact: true }).click();

    await expect(page).toHaveURL(/\/mosaic\/configure\/index$/);
    await expect(drawer).toHaveCount(0);
  });

  test('the header menu closes with its close button', async ({ page }) => {
    await gotoHydrated(page, '/mosaic/author/index');

    await page.getByRole('button', { name: 'show the tab navigation' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: 'Close Drawer' }).click();

    await expect(drawer).toHaveCount(0);
  });

  for (const name of ['show the tab navigation', 'show the main navigation']) {
    test(`${name} closes with Escape and returns focus`, async ({ page }) => {
      await gotoHydrated(page, '/mosaic/author/index');
      const trigger = page.getByRole('button', { name });
      await trigger.click();
      const drawer = page.getByRole('dialog');
      await expect(drawer).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(drawer).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }

  test('the page navigation opens in a drawer and follows a link', async ({ page }) => {
    await gotoHydrated(page, '/mosaic/author/index');

    await page.getByRole('button', { name: 'show the main navigation' }).click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('link', { name: 'Aliases', exact: true }).click();

    await expect(page).toHaveURL(/\/mosaic\/author\/aliases$/);
    await expect(drawer).toHaveCount(0);
  });

  const fits = [
    '/mosaic/author/index',
    '/mosaic/configure/index',
    '/mosaic/author/markdown-syntax'
  ];
  // Known overflows: the home page's hero and the card grid on Getting Started.
  const overflows = ['/mosaic/index', '/mosaic/getting-started/index'];

  for (const path of [...fits, ...overflows]) {
    test(`${path} fits the screen without scrolling sideways`, async ({ page }) => {
      test.fixme(overflows.includes(path), 'Wider than the screen; layout fix pending');
      await gotoHydrated(page, path);
      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }
});
