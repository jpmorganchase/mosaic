import { expect, test } from '@playwright/test';
import { writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';

// Use e2e/fixtures/llms/mosaic.config.mjs in active mode or generate its snapshot.
// The same checks run against a server build and its fully static export.
test.describe('Scoped LLM fixture', () => {
  // Discovery must be present in the initial HTML without hydration.
  test.use({ javaScriptEnabled: false });
  test.skip(process.env.MOSAIC_LLMS_FIXTURE !== '1', 'Requires the multi-source LLM fixture');
  const isStatic = process.env.MOSAIC_LLMS_STATIC === '1';

  test('serves authored public Markdown outside the generated bundle', async ({ request }) => {
    const response = await request.get('/llms-fixture-authored.md');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('# Authored public Markdown fixture');
  });

  test('serves the advertised canonical root Markdown URL', async ({ request }) => {
    const index = await request.get('/llms.txt');
    const text = await index.text();
    // The root page heads the index, linked like a folder's index page.
    expect(text).toMatch(
      /## Documentation scopes\n\n(?:- .+\n)+\n## \[Home fixture\]\(\/\.md\)\n\n## /
    );
    expect(text).not.toContain('Undefined');
    const response = await request.get('/.md');
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain('Canonical root documentation.');
    if (!isStatic) {
      expect(response.headers()['content-type']).toContain('text/markdown');
      expect(response.headers().link).toContain('</.md>; rel="alternate"');
      expect(response.headers().link).toContain('</llms.txt>; rel="describedby"');
    }
  });

  test('refreshes the active source and removes deleted Markdown from every corpus', async ({
    request,
    browserName
  }) => {
    test.skip(process.env.MOSAIC_LLMS_ACTIVE !== '1', 'Requires the local active fixture source');
    test.skip(browserName !== 'chromium', 'Mutate the shared source once across browser projects');
    const file = resolve(__dirname, 'fixtures/llms/salt/components/refresh-probe.mdx');
    const route = '/salt/components/refresh-probe.md';
    const marker = 'Scoped refresh probe content';
    let created = false;
    try {
      await writeFile(
        file,
        `---\ntitle: Refresh probe\nlayout: DetailOverview\n---\n\n${marker}\n`,
        { flag: 'wx' }
      );
      created = true;
      await expect
        .poll(async () => (await request.get(route)).status(), { timeout: 45_000 })
        .toBe(200);
      for (const url of [
        '/llms-full.txt',
        '/salt/llms-full.txt',
        '/salt/components/llms-full.txt'
      ]) {
        await expect
          .poll(async () => (await request.get(url)).text(), { timeout: 45_000 })
          .toContain(marker);
      }
    } finally {
      if (created) await unlink(file);
    }
    await expect
      .poll(async () => (await request.get(route)).status(), { timeout: 45_000 })
      .toBe(404);
    for (const url of ['/llms-full.txt', '/salt/llms-full.txt', '/salt/components/llms-full.txt']) {
      await expect
        .poll(async () => (await request.get(url)).text(), { timeout: 45_000 })
        .not.toContain(marker);
    }
  });

  test('serves global and nested indexes without crossing public prefixes', async ({ request }) => {
    const root = await request.get('/llms.txt');
    expect(root.status()).toBe(200);
    const rootBody = await root.text();
    for (const route of [
      '/salt/llms.txt',
      '/mosaic/llms.txt',
      '/salt/components/button.md',
      '/mosaic/index.md',
      '/about.md'
    ])
      expect(rootBody).toContain(route);
    for (const scope of ['/salt', '/mosaic']) {
      for (const file of ['llms.txt', 'llms-full.txt']) {
        const response = await request.get(`${scope}/${file}`);
        expect(response.status()).toBe(200);
        expect(response.headers()['content-type']).toContain('text/plain');
        expect(await response.text()).not.toMatch(/SECRET|\/salted\/|About fixture/);
        if (scope === '/salt') expect(await response.text()).not.toContain('Mosaic fixture');
        else expect(await response.text()).not.toContain('Button fixture');
      }
    }
    const full = await request.get('/llms-full.txt');
    expect(full.status()).toBe(200);
    expect(await full.text()).toContain('Mosaic fixture');
    expect(await full.text()).toContain('Button fixture');
    expect(await full.text()).toContain('Salted fixture');
    expect(await full.text()).not.toContain('SECRET');
  });

  test('keeps Markdown endpoints and content negotiation consistent', async ({ request }) => {
    const url = '/salt/components/button';
    const md = await request.get(`${url}.md`);
    expect(md.status()).toBe(200);
    expect(await md.text()).toContain('[/salt/components/llms.txt]');
    const html = await request.get(url, { headers: { Accept: 'text/html' } });
    expect(html.status()).toBe(200);
    expect(html.headers()['content-type']).toContain('text/html');
    if (!isStatic) {
      const negotiated = await request.get(url, { headers: { Accept: 'text/markdown' } });
      expect(await negotiated.text()).toBe(await md.text());
      for (const response of [md, negotiated]) {
        expect(response.headers()['content-type']).toContain('text/markdown');
        expect(response.headers().vary).toContain('Accept');
        expect(response.headers()['x-robots-tag']).toBe('noindex');
        expect(response.headers().link).toContain('</salt/components/llms.txt>; rel="describedby"');
      }
    }
    expect(await (await request.get('/salt.md')).text()).toBe(
      await (await request.get('/salt/index.md')).text()
    );
  });

  test('HTML links use the most-specific canonical index, including aliases and unscoped pages', async ({
    page,
    request
  }) => {
    for (const [route, markdown, index] of [
      ['/salt/components/button', '/salt/components/button.md', '/salt/components/llms.txt'],
      ['/mosaic/button-alias', '/salt/components/button.md', '/salt/components/llms.txt'],
      ['/salt/index', '/salt/index.md', '/salt/llms.txt'],
      ['/mosaic/index', '/mosaic/index.md', '/mosaic/llms.txt'],
      ['/salted/index', '/salted/index.md', '/llms.txt'],
      ['/about', '/about.md', '/llms.txt']
    ]) {
      const response = await request.get(route);
      const html = await response.text();
      expect(html).toContain(`rel="alternate" type="text/markdown" href="${markdown}"`);
      expect(html).toContain(`rel="describedby" href="${index}"`);
      await page.goto(route);
      await expect(page.locator('head link[rel="alternate"][type="text/markdown"]')).toHaveCount(1);
      await expect(page.locator('head link[rel="describedby"]')).toHaveAttribute('href', index);
    }
    await page.goto('/salt/hidden');
    await expect(page.locator('link[rel="alternate"][type="text/markdown"]')).toHaveCount(0);
  });

  test('unknown scopes and excluded Markdown return 404', async ({ request }) => {
    for (const route of [
      '/missing/llms.txt',
      '/salted/llms.txt',
      '/salt/hidden.md',
      '/salt/private/internal.md',
      '/salt/ignored.md',
      '/mosaic/button-alias.md'
    ]) {
      expect((await request.get(route)).status()).toBe(404);
    }
  });
});
