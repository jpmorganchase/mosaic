import { test, expect, type Page } from '@playwright/test';

/**
 * Client-side navigation. The other suites load every page directly, so
 * these cover what only happens after hydration: the namespace layout
 * keeps the header mounted, the section layout supplies each section's
 * sidebar tree, and the router's prefetch and navigation requests
 * succeed. In a static export those requests fetch `.txt` segment files,
 * so `yarn e2e:static` runs this suite against `out/` too.
 */

const sidebar = (page: Page) => page.getByTestId('vertical-navigation');

/** Load a page and wait for hydration (`ThemeProvider` then drops `mosaic-ssr`). */
async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('.mosaic-ssr')).toHaveCount(0);
}

/** Mark the header element, so a remount or a full page load drops the mark. */
async function markHeader(page: Page) {
  await page
    .locator('header')
    .first()
    .evaluate(header => header.setAttribute('data-e2e-mark', ''));
}

async function expectHeaderKept(page: Page) {
  await expect(page.locator('header[data-e2e-mark]')).toHaveCount(1);
}

/** The sidebar shows links, and every one of them points into `section`. */
async function expectSidebarIn(page: Page, section: string) {
  await expect(sidebar(page).locator('a[href]').first()).toBeVisible();
  await expect
    .poll(() =>
      sidebar(page)
        .locator('a[href]')
        .evaluateAll((links, prefix) => {
          const hrefs = links.map(link => link.getAttribute('href') ?? '');
          return hrefs.filter(href => !href.startsWith(prefix));
        }, section)
    )
    .toEqual([]);
}

/**
 * Collect failed router requests (RSC fetches, or `.txt` segment files in
 * a static export) for pages under `prefixes`. Links elsewhere may point
 * at pages that don't exist, which isn't the router's fault.
 */
function trackRouterFailures(page: Page, prefixes: string[]) {
  const failures: string[] = [];
  page.on('response', response => {
    const url = new URL(response.url());
    const isRouterRequest = url.searchParams.has('_rsc') || url.pathname.endsWith('.txt');
    if (
      isRouterRequest &&
      response.status() >= 400 &&
      prefixes.some(prefix => url.pathname.startsWith(prefix))
    ) {
      failures.push(`${response.status()} ${url.pathname}`);
    }
  });
  return failures;
}

test.describe('Client-side navigation', () => {
  test('keeps the header mounted when navigating within a section', async ({ page }) => {
    const failures = trackRouterFailures(page, ['/mosaic/test/']);
    await gotoHydrated(page, '/mosaic/test/layouts/detail-technical');
    await markHeader(page);

    await sidebar(page).getByRole('button', { name: 'Layouts', exact: true }).click();
    await sidebar(page)
      .getByRole('link', { name: 'Detail Overview Test Page', exact: true })
      .click();

    await expect(page).toHaveURL(/\/mosaic\/test\/layouts\/detail-overview$/);
    await expect(page.getByRole('heading', { name: 'Detail Overview Test Page' })).toBeVisible();
    await expectHeaderKept(page);
    await expectSidebarIn(page, '/mosaic/test/');

    await page.goBack();
    await expect(page).toHaveURL(/\/mosaic\/test\/layouts\/detail-technical$/);
    await expect(page.getByRole('heading', { name: 'Detail Technical Test Page' })).toBeVisible();
    await expectHeaderKept(page);
    expect(failures).toEqual([]);
  });

  test("shows the new section's sidebar after navigating to another section", async ({ page }) => {
    const failures = trackRouterFailures(page, ['/mosaic/author/', '/mosaic/configure/']);
    await gotoHydrated(page, '/mosaic/author/index');
    await expectSidebarIn(page, '/mosaic/author/');
    await markHeader(page);

    await page.locator('header').getByRole('link', { name: 'Configure', exact: true }).click();

    await expect(page).toHaveURL(/\/mosaic\/configure\/index$/);
    await expectSidebarIn(page, '/mosaic/configure/');
    await expectHeaderKept(page);
    expect(failures).toEqual([]);
  });
});
