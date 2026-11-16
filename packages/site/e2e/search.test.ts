import { test, expect } from '@playwright/test';

test('Search waits for hydration before accepting input', async ({ page }) => {
  let releaseScripts!: () => void;
  const scriptsReady = new Promise<void>(resolve => {
    releaseScripts = resolve;
  });
  await page.route('**/*', async route => {
    if (route.request().resourceType() === 'script') await scriptsReady;
    await route.continue();
  });

  try {
    await page.goto('/', { waitUntil: 'commit' });
    const search = page.getByRole('textbox', { name: 'Search', exact: true });
    await expect(search).toBeVisible();
    await expect(search).toBeDisabled();
    releaseScripts();
    await expect(search).toBeEnabled();
    await search.fill('rootDirGlob');
    await expect(
      page.getByRole('region', { name: 'Search results' }).locator('a[href*="#"]').first()
    ).toBeVisible();
    await expect(search).toHaveValue('rootDirGlob');
  } finally {
    releaseScripts();
    await page.unrouteAll({ behavior: 'wait' });
  }
});

test('Header searches records and follows section links without legacy requests', async ({
  page
}) => {
  const requested: string[] = [];
  page.on('request', request => requested.push(new URL(request.url()).pathname));
  await page.goto('/');
  const search = page.getByRole('textbox', { name: 'Search', exact: true });
  await expect(search).toBeVisible();
  expect(requested).not.toContain('/search-records.json');
  expect(requested).not.toContain('/api/search');
  await search.fill('rootDirGlob');
  const results = page.getByRole('region', { name: 'Search results' });
  const section = results.locator('a[href*="#"]').first();
  await expect(section).toBeVisible();
  const href = await section.getAttribute('href');
  await section.click();
  await expect(page).toHaveURL(new URL(href!, page.url()).toString());
  await expect
    .poll(() =>
      page.evaluate(() => {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        if (!target) return false;
        const bounds = target.getBoundingClientRect();
        const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
        return bounds.top >= headerBottom - 2 && bounds.top < window.innerHeight;
      })
    )
    .toBe(true);
  await expect(search).toHaveValue('');
  const usedServer = requested.includes('/api/search');
  const usedBrowser = requested.includes('/search-records.json');
  expect(usedServer || usedBrowser).toBe(true);
  expect(usedServer && usedBrowser).toBe(false);
  expect(
    requested.filter(path => /\/search-(data(?:-condensed)?|config)\.json$/.test(path))
  ).toEqual([]);
});
