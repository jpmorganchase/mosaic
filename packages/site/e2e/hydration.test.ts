import { expect, test } from '@playwright/test';

const route = '/mosaic/test/hydration/index';

test('linked headings and inline tags hydrate without content errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      /hydrat|cannot be a descendant|cannot contain/i.test(message.text())
    ) {
      errors.push(message.text());
    }
  });
  await page.goto(route);
  await expect(page.locator('.mosaic-ssr')).toHaveCount(0);
  const heading = page.getByRole('heading', { name: /Read the guide/ });
  await expect(heading.getByRole('link', { name: 'the guide', exact: true })).toHaveAttribute(
    'href',
    '/mosaic/author/index'
  );
  await expect(
    heading.locator('..').getByRole('link', { name: 'Copy link to heading' })
  ).toHaveCount(1);
  await expect(page.locator('a a')).toHaveCount(0);
  await expect(page.locator('p').filter({ hasText: 'Available as RC today.' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('keeps authored links and tag text in valid server HTML', async ({ page }) => {
    await page.goto(route);
    const paragraph = page.locator('p').filter({ hasText: 'Available as RC today.' });
    await expect(paragraph).toHaveCount(1);
    await expect(paragraph.locator('div')).toHaveCount(0);
    await expect(
      page
        .getByRole('heading', { name: /Read the guide/ })
        .getByRole('link', { name: 'the guide', exact: true })
    ).toBeVisible();
    await expect(page.locator('a a')).toHaveCount(0);
  });
});
