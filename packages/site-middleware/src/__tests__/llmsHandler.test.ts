/**
 * `createLlmsHandler`: serving `llms.txt`, `llms-full.txt` and each page's
 * Markdown from the snapshot or the content server.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import type { MarkdownPagesFile } from '@jpmorganchase/mosaic-types';

import { createLlmsHandler } from '../llmsHandler.js';

const pages: MarkdownPagesFile = {
  version: 1,
  pages: {
    '/': '# Home',
    '/docs/index': '---\ntitle: "Docs"\n---\n\nWelcome.\n',
    '/docs/button/index': '---\ntitle: "Button"\n---\n\nPress it.\n',
    '/docs/button/usage': '---\ntitle: "Button usage"\n---\n\nUse it.\n',
    '/docs/hello world': '# Spaces remain supported',
    '/docs/café': '# Unicode remains supported'
  }
};

const get = async (handler: ReturnType<typeof createLlmsHandler>, ...segments: string[]) => {
  const response = await handler(new Request('http://localhost/api/llms'), {
    params: Promise.resolve({ path: segments })
  });
  return {
    status: response.status,
    type: response.headers.get('Content-Type'),
    cache: response.headers.get('Cache-Control'),
    vary: response.headers.get('Vary'),
    body: await response.text()
  };
};

describe('snapshot-file mode', () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-llms-handler-'));
    fs.writeFileSync(path.join(root, 'markdown-pages.json'), JSON.stringify(pages));
    fs.writeFileSync(path.join(root, 'llms.txt'), '# Docs\n');
    fs.writeFileSync(path.join(root, 'llms-full.txt'), 'Everything.\n');
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), root));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const handler = createLlmsHandler({ mode: 'snapshot-file' });

  test('serves a page as Markdown', async () => {
    expect(await get(handler, 'docs', 'button', 'usage')).toEqual({
      status: 200,
      type: 'text/markdown; charset=utf-8',
      cache: 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
      vary: 'Accept',
      body: pages.pages['/docs/button/usage']
    });
  });

  test('serves a folder from its index page, and ignores .md and case', async () => {
    expect((await get(handler, 'docs', 'button')).body).toBe(pages.pages['/docs/button/index']);
    expect((await get(handler, 'Docs', 'Button', 'Usage.md')).body).toBe(
      pages.pages['/docs/button/usage']
    );
    expect((await get(handler, 'docs', 'index')).body).toBe(pages.pages['/docs/index']);
  });

  test('points the Markdown at the HTML page it came from', async () => {
    const link = async (...segments: string[]) =>
      (
        await handler(new Request('http://localhost/api/llms'), {
          params: Promise.resolve({ path: segments })
        })
      ).headers.get('Link');
    expect(await link('docs', 'button', 'usage')).toMatch(
      /^<\/docs\/button\/usage>; rel="canonical", /
    );
    expect(await link('docs', 'button')).toMatch(/^<\/docs\/button\/index>; rel="canonical", /);
    expect(await link('Docs', 'Button', 'Usage.md')).toMatch(
      /^<\/docs\/button\/usage>; rel="canonical", /
    );
    expect(await link('.md')).toMatch(/^<\/>; rel="canonical", /);
  });

  test('serves a canonical root page at /.md without requiring a manifest', async () => {
    expect(await get(handler, '.md')).toMatchObject({
      status: 200,
      type: 'text/markdown; charset=utf-8',
      body: '# Home'
    });
  });

  test('serves llms.txt and llms-full.txt as text', async () => {
    expect(await get(handler, 'llms.txt')).toMatchObject({
      status: 200,
      type: 'text/plain; charset=utf-8',
      body: '# Docs\n'
    });
    expect((await get(handler, 'llms-full.txt')).body).toBe('Everything.\n');
  });

  test('preserves legacy route keys with spaces and Unicode and escapes discovery headers', async () => {
    for (const route of ['hello world', 'café']) {
      const response = await handler(new Request('http://localhost/api/llms'), {
        params: Promise.resolve({ path: ['docs', `${route}.md`] })
      });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(pages.pages[`/docs/${route}`]);
      expect(response.headers.get('Link')).toContain(`/docs/${encodeURIComponent(route)}.md`);
      expect(response.headers.get('Link')).toContain(
        `</docs/${encodeURIComponent(route)}>; rel="canonical"`
      );
    }
  });

  test('responds 404 for other paths', async () => {
    expect(await get(handler, 'docs', 'missing')).toMatchObject({ status: 404, body: 'Not found' });
    expect((await get(handler, 'docs', 'button', 'index', 'index')).status).toBe(404);
    expect((await get(handler)).status).toBe(404);
  });

  test('responds 404 when the site has no Markdown files', async () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'mosaic-llms-empty-'));
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), empty));
    const fresh = createLlmsHandler({ mode: 'snapshot-file' });
    expect((await get(fresh, 'docs')).status).toBe(404);
    expect((await get(fresh, 'llms.txt')).status).toBe(404);
    vi.stubEnv('MOSAIC_SNAPSHOT_DIR', path.relative(process.cwd(), root));
    fs.rmSync(empty, { recursive: true, force: true });
  });
});

describe('active mode', () => {
  const contentUrl = 'http://content.test';

  test('fetches the files from the content server, and responds 503 when it fails', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url === `${contentUrl}/markdown-pages.json`) return new Response(JSON.stringify(pages));
      if (url === `${contentUrl}/llms.txt`) return new Response('# Docs\n');
      if (url === `${contentUrl}/llms-manifest.json`)
        return new Response('missing', { status: 404 });
      return new Response('down', { status: 502 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const handler = createLlmsHandler({ mode: 'active', contentUrl });

    expect(await get(handler, 'docs', 'button')).toMatchObject({
      status: 200,
      cache: 'no-store',
      body: pages.pages['/docs/button/index']
    });
    expect((await get(handler, 'llms.txt')).body).toBe('# Docs\n');
    expect(await get(handler, 'llms-full.txt')).toMatchObject({
      status: 503,
      body: 'Markdown is unavailable'
    });

    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });
});
