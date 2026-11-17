import { expect, test, type Page } from '@playwright/test';

async function gridGeometry(page: Page) {
  return page
    .locator('[data-mosaic-cards]')
    .first()
    .evaluate(element => {
      const columns = getComputedStyle(element)
        .gridTemplateColumns.split(' ')
        .filter(Boolean).length;
      return { columns, width: element.getBoundingClientRect().width };
    });
}

for (const width of [390, 600, 960, 1280, 1920]) {
  test(`Cards columns match before and after hydration at ${width}px`, async ({
    browser,
    baseURL
  }) => {
    const server = await browser.newContext({
      baseURL,
      viewport: { width, height: 900 },
      javaScriptEnabled: false
    });
    const hydrated = await browser.newContext({ baseURL, viewport: { width, height: 900 } });
    try {
      const serverPage = await server.newPage();
      const hydratedPage = await hydrated.newPage();
      await Promise.all([
        serverPage.goto('/mosaic/getting-started/index'),
        hydratedPage.goto('/mosaic/getting-started/index')
      ]);
      await expect(hydratedPage.locator('.mosaic-ssr')).toHaveCount(0);
      const before = await gridGeometry(serverPage);
      const after = await gridGeometry(hydratedPage);
      expect(before.columns).toBe(width >= 1280 ? 3 : width >= 600 ? 2 : 1);
      expect(after.columns).toBe(before.columns);
      expect(after.width).toBeCloseTo(before.width, 0);
      await hydratedPage.setViewportSize({ width: 390, height: 900 });
      await expect.poll(async () => (await gridGeometry(hydratedPage)).columns).toBe(1);
    } finally {
      await server.close();
      await hydrated.close();
    }
  });
}

test.describe('server header', () => {
  test.use({ javaScriptEnabled: false });
  test('exposes desktop links and styles controls before hydration', async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto('/mosaic/index');
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'light');
    await expect(page.locator('html')).toHaveClass(/salt-density-low/);
    const header = page.locator('header').first();
    await expect(header.getByRole('link', { name: 'Configure', exact: true })).toBeVisible();
    await expect(header.locator('img').first()).toBeVisible();
    await expect(header.getByRole('img', { name: 'search', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'show the tab navigation' })).toBeHidden();
    await expect(header.getByRole('textbox', { name: 'Search' })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 900 });
    await expect(page.getByRole('button', { name: 'show the tab navigation' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Configure', exact: true })).toBeHidden();
  });
});

for (const javaScriptEnabled of [false, true]) {
  test(`nested Cards keep their own breakpoints with JavaScript ${javaScriptEnabled}`, async ({
    browser,
    baseURL
  }) => {
    const context = await browser.newContext({
      baseURL,
      javaScriptEnabled,
      viewport: { width: 800, height: 900 }
    });
    try {
      const page = await context.newPage();
      await page.goto('/mosaic/test/hydration/index');
      if (javaScriptEnabled) await expect(page.locator('.mosaic-ssr')).toHaveCount(0);
      const columnCount = (testId: string) =>
        page
          .getByTestId(testId)
          .evaluate(
            element =>
              getComputedStyle(element).gridTemplateColumns.split(/\s+/).filter(Boolean).length
          );
      await expect.poll(() => columnCount('parent-cards')).toBe(3);
      await expect.poll(() => columnCount('nested-cards')).toBe(1);
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect.poll(() => columnCount('nested-cards')).toBe(2);
      await page.setViewportSize({ width: 800, height: 900 });
      await expect.poll(() => columnCount('nested-cards')).toBe(1);
    } finally {
      await context.close();
    }
  });
}

test('closes desktop menu portals when the header switches to mobile', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto('/mosaic/test/hydration/index');
  const trigger = page.getByRole('button', { name: 'Resources', exact: true });
  await trigger.click();
  await expect(page.getByRole('menu')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 900 });
  await expect(trigger).toBeHidden();
  await expect(page.getByRole('menu')).toHaveCount(0);
  await page.setViewportSize({ width: 1200, height: 900 });
  await trigger.click();
  await expect(page.getByRole('menuitem', { name: 'Author guide' })).toBeVisible();
});
