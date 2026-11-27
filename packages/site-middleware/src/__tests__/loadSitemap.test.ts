import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { readContentFile } from '../contentFiles.js';
import { loadSitemap, parseSitemapXml } from '../loadSitemap.js';

describe('parseSitemapXml', () => {
  it('returns host-stripped pathnames from <loc> entries', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/mosaic/index</loc></url>
  <url><loc>https://example.com/mosaic/author/aliases</loc></url>
  <url><loc>https://example.com/local/index</loc></url>
</urlset>`;

    expect(parseSitemapXml(xml)).toEqual([
      '/mosaic/index',
      '/mosaic/author/aliases',
      '/local/index'
    ]);
  });

  it('tolerates already-relative <loc> values', () => {
    const xml = `<urlset>
      <url><loc>/mosaic/index</loc></url>
      <url><loc>mosaic/sitemap</loc></url>
    </urlset>`;

    expect(parseSitemapXml(xml)).toEqual(['/mosaic/index', '/mosaic/sitemap']);
  });

  it('returns an empty array when no entries are present', () => {
    expect(parseSitemapXml('<urlset></urlset>')).toEqual([]);
    expect(parseSitemapXml('')).toEqual([]);
  });

  it('handles whitespace inside <loc> tags', () => {
    const xml = `<url><loc>
      https://example.com/mosaic/index
    </loc></url>`;
    expect(parseSitemapXml(xml)).toEqual(['/mosaic/index']);
  });
});

it('reads sitemap and generated assets from an absolute snapshot directory', async () => {
  const snapshotDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mosaic-absolute-snapshot-'));
  const searchRecords = '{"version":1,"records":[]}';
  vi.stubEnv('MOSAIC_MODE', 'snapshot-file');
  vi.stubEnv('MOSAIC_SNAPSHOT_DIR', snapshotDir);

  try {
    await Promise.all([
      fs.writeFile(
        path.join(snapshotDir, 'sitemap.xml'),
        '<urlset><url><loc>https://example.com/docs/index</loc></url></urlset>'
      ),
      fs.writeFile(path.join(snapshotDir, 'search-records.json'), searchRecords)
    ]);

    await expect(loadSitemap()).resolves.toEqual(['/docs/index']);
    await expect(
      readContentFile('search-records.json', 'snapshot-file', '')
    ).resolves.toMatchObject({
      text: searchRecords
    });
  } finally {
    vi.unstubAllEnvs();
    await fs.rm(snapshotDir, { recursive: true, force: true });
  }
});

describe('loadSitemap (active mode)', () => {
  const fetchMock = vi.fn<typeof fetch>();
  // Stash env so per-test mutations don't leak.
  let originalMode: string | undefined;
  let originalUrl: string | undefined;

  beforeEach(() => {
    originalMode = process.env.MOSAIC_MODE;
    originalUrl = process.env.MOSAIC_ACTIVE_MODE_URL;
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    process.env.MOSAIC_MODE = 'active';
    process.env.MOSAIC_ACTIVE_MODE_URL = 'http://content.test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalMode === undefined) delete process.env.MOSAIC_MODE;
    else process.env.MOSAIC_MODE = originalMode;
    if (originalUrl === undefined) delete process.env.MOSAIC_ACTIVE_MODE_URL;
    else process.env.MOSAIC_ACTIVE_MODE_URL = originalUrl;
  });

  it('fetches sitemap.xml from the FS server and returns parsed pathnames', async () => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/mosaic/index</loc></url>
  <url><loc>https://example.com/mosaic/author/aliases</loc></url>
</urlset>`;
    fetchMock.mockResolvedValueOnce(new Response(xml, { status: 200 }));

    const result = await loadSitemap();

    expect(result).toEqual(['/mosaic/index', '/mosaic/author/aliases']);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith('http://content.test/sitemap.xml', {
      cache: 'no-store'
    });
  });

  it('returns [] (no throw) when MOSAIC_ACTIVE_MODE_URL is unset', async () => {
    delete process.env.MOSAIC_ACTIVE_MODE_URL;

    const result = await loadSitemap();

    expect(result).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns [] when the FS server responds with a non-OK status', async () => {
    fetchMock.mockResolvedValueOnce(new Response('Not found', { status: 404 }));

    const result = await loadSitemap();

    expect(result).toEqual([]);
  });

  it('returns [] when fetch rejects (network down)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await loadSitemap();

    expect(result).toEqual([]);
  });
});
