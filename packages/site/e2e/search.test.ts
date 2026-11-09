import { test, expect } from '@playwright/test';

test('The snapshot search index is served as JSON', async ({ request }) => {
  const response = await request.get('/search-data.json');
  await expect(response).toBeOK();
  expect(response.headers()['content-type']).toContain('application/json');
  expect(await response.json()).toContainEqual(expect.objectContaining({ route: '/mosaic/index' }));
});

test('Header should include a search icon', async ({ page }) => {
  await page.goto('/');
  const searchIcon = page.getByTestId('SearchIcon');
  await expect(searchIcon).toHaveAttribute('aria-label', 'search');
});
