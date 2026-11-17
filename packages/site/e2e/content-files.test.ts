import { expect, test } from '@playwright/test';

// These requests exercise the reference site's generated snapshot and routing,
// which handler unit tests with fixture files cannot validate.
test.describe('Generated search and Markdown', () => {
  test('searches the deployed snapshot', async ({ request }) => {
    const response = await request.get('/api/search', { params: { q: 'plugins' } });
    expect(response.status()).toBe(200);
    const { query, results } = await response.json();
    expect(query).toBe('plugins');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].href).toMatch(/^\/mosaic\//);
  });

  test('serves the search records for browser consumers', async ({ request }) => {
    const response = await request.get('/search-records.json');
    expect(response.status()).toBe(200);
    const { version, records } = await response.json();
    expect(version).toBe(1);
    expect(records.length).toBeGreaterThan(0);
  });

  test('serves both agent indexes', async ({ request }) => {
    for (const url of ['/llms.txt', '/llms-full.txt']) {
      const response = await request.get(url);
      expect(response.status()).toBe(200);
      expect(await response.text()).toContain('# Mosaic');
    }
  });

  test('serves a page and its folder alias as the same Markdown', async ({ request }) => {
    const page = await request.get('/mosaic/configure/plugins/index.md');
    const folder = await request.get('/mosaic/configure/plugins.md');
    expect(page.status()).toBe(200);
    expect(folder.status()).toBe(200);
    expect(await folder.text()).toBe(await page.text());
    expect(await page.text()).toContain('Plugins');
  });

  test('negotiates Markdown at a page URL while retaining HTML', async ({ request }) => {
    const url = '/mosaic/configure/plugins/index';
    const markdown = await request.get(url, { headers: { Accept: 'text/markdown' } });
    expect(markdown.status()).toBe(200);
    expect(markdown.headers()['content-type']).toContain('text/markdown');
    expect(await markdown.text()).toContain('Plugins');

    const html = await request.get(url, { headers: { Accept: 'text/html' } });
    expect(html.status()).toBe(200);
    expect(html.headers()['content-type']).toContain('text/html');
  });

  test('does not publish excluded test fixtures as Markdown', async ({ request }) => {
    const response = await request.get('/mosaic/test/layouts/edit.md');
    expect(response.status()).toBe(404);
  });
});
