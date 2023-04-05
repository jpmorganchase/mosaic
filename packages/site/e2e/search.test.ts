import { test, expect } from '@playwright/test';
test('Header should include a search icon', async ({ page }) => {
  await page.goto('/');
  const searchIcon = page.getByTestId('SearchIcon');
  await expect(searchIcon).toHaveAttribute('aria-label', 'search');
});
