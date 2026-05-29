import { describe, expect, it } from 'vitest';

import { parseSitemapXml } from '../loadSitemap.js';

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
