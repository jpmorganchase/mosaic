import { expect, test } from '@playwright/test';

// Build a writable snapshot with one destination, then start that build with
// another. See fixtures/authoring/README.md. Static exports use the build value.
test.describe('authoring destination', () => {
  test.skip(
    process.env.MOSAIC_AUTHORING_FIXTURE !== '1',
    'Requires the authoring snapshot fixture'
  );
  const destination = process.env.MOSAIC_AUTHORING_TEST_URL ?? 'https://runtime.example.com/base';
  const staticExport = process.env.MOSAIC_AUTHORING_STATIC === '1';

  test('loads the deployed destination and opens Edit there', async ({ page, request }) => {
    if (!staticExport) {
      const response = await request.get('/api/authoring');
      expect(response.headers()['cache-control']).toBe('no-store');
      expect(await response.json()).toEqual({ url: destination });
    }
    const requests: string[] = [];
    page.on('request', request => requests.push(new URL(request.url()).pathname));
    await page.route(`${destination}/**`, route =>
      route.fulfill({ contentType: 'text/html', body: '<p>Authoring site</p>' })
    );
    await page.goto('/docs/index');
    await page
      .getByRole('button', { name: `edit this page on ${new URL(destination).host}` })
      .click();
    await expect(page).toHaveURL(`${destination}/docs/index?edit=1`);
    if (staticExport) expect(requests).not.toContain('/api/authoring');
  });

  for (const action of ['edit', 'new']) {
    test(`redirects a direct ${action} link on a prerendered page`, async ({ page }) => {
      const pathname = action === 'new' ? '/docs/new-page.mdx' : '/docs/index';
      await page.route(`${destination}/**`, route =>
        route.fulfill({ contentType: 'text/html', body: '<p>Authoring site</p>' })
      );
      await page.goto(`${pathname}?${action}=1&title=Example`);
      await expect(page).toHaveURL(`${destination}${pathname}?${action}=1&title=Example`);
    });
  }
});
