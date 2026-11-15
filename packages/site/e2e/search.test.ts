import { test, expect } from '@playwright/test';

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
  await expect(search).toHaveValue('');
  const usedServer = requested.includes('/api/search');
  const usedBrowser = requested.includes('/search-records.json');
  expect(usedServer || usedBrowser).toBe(true);
  expect(usedServer && usedBrowser).toBe(false);
  expect(
    requested.filter(path => /\/search-(data(?:-condensed)?|config)\.json$/.test(path))
  ).toEqual([]);
});
