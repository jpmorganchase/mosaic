/**
 * Unit tests for {@link deriveFromSitemap}.
 *
 * Pure function, no React. Lives in the client project because
 * the implementation uses the browser-only `DOMParser`; jsdom is
 * sufficient (it ships the same `application/xml` parsing path).
 *
 * Coverage focus
 * --------------
 * 1. **Folder derivation** — every ancestor segment of every
 *    leaf URL becomes a folder; the leaf itself does not.
 * 2. **Route derivation** — the full leaf pathname is captured
 *    verbatim (used by the New-Page dialog's collision check).
 * 3. **Sort + dedupe** — both result arrays are
 *    sorted-alphabetical and unique, so a dialog re-render
 *    against the same sitemap is identity-stable.
 * 4. **XML namespace handling** — the real sitemap from Next's
 *    App Router uses `xmlns="http://www.sitemaps.org/..."`,
 *    which `querySelectorAll('loc')` misses in non-Chrome
 *    browsers. The implementation uses
 *    `getElementsByTagNameNS('*', 'loc')` to dodge that — pin
 *    the behaviour with a namespaced fixture.
 * 5. **Fail-soft** — XML parse errors return empty results
 *    rather than throwing; callers (the editor's combobox)
 *    treat the degraded path as "no suggestions, free-text
 *    still works".
 */
import { describe, expect, it } from 'vitest';

import { deriveFromSitemap } from '../useFolderSuggestions';

describe('deriveFromSitemap', () => {
  it('extracts folders from each leaf URL ancestor (no leaf)', () => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/mosaic/configure/sources/foo</loc></url>
</urlset>`;

    const { folders } = deriveFromSitemap(xml);

    // Leaf URL contributes its ancestors only; the leaf itself
    // is not a folder.
    expect(folders).toEqual(['/mosaic', '/mosaic/configure', '/mosaic/configure/sources']);
  });

  it('captures the full leaf pathname in routes', () => {
    const xml = `<?xml version="1.0"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://example.com/mosaic/configure/sources/foo</loc></url>
  <url><loc>https://example.com/mosaic/index</loc></url>
</urlset>`;

    const { routes } = deriveFromSitemap(xml);

    expect(routes).toEqual(['/mosaic/configure/sources/foo', '/mosaic/index']);
  });

  it('returns sorted, unique folders across many URLs', () => {
    // `/mosaic` is shared by both URLs but appears once;
    // order is alphabetical so the dropdown is stable.
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/mosaic/b/page</loc></url>
      <url><loc>https://example.com/mosaic/a/page</loc></url>
    </urlset>`;

    const { folders } = deriveFromSitemap(xml);

    expect(folders).toEqual(['/mosaic', '/mosaic/a', '/mosaic/b']);
  });

  it('treats already-relative <loc> values as pathnames', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>/mosaic/foo</loc></url>
      <url><loc>mosaic/bar</loc></url>
    </urlset>`;

    const { folders, routes } = deriveFromSitemap(xml);

    expect(routes).toEqual(['/mosaic/bar', '/mosaic/foo']);
    expect(folders).toEqual(['/mosaic']);
  });

  it('ignores empty <loc> values', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc></loc></url>
      <url><loc>https://example.com/mosaic/page</loc></url>
    </urlset>`;

    const { folders, routes } = deriveFromSitemap(xml);

    expect(folders).toEqual(['/mosaic']);
    expect(routes).toEqual(['/mosaic/page']);
  });

  it('returns empty results when the XML fails to parse', () => {
    // `<<` is a hard parse error in `application/xml` mode — the
    // implementation detects via the `<parsererror>` element
    // jsdom injects and short-circuits rather than throwing.
    const { folders, routes } = deriveFromSitemap('<<not xml>>');

    expect(folders).toEqual([]);
    expect(routes).toEqual([]);
  });

  it('returns empty results when no <loc> entries exist', () => {
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;

    expect(deriveFromSitemap(xml)).toEqual({ folders: [], routes: [] });
  });

  it('handles a single-segment root URL with no ancestors', () => {
    // `/foo` has no parent folder — we don't synthesise `/` as a
    // folder option (callers can still type it).
    const xml = `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://example.com/foo</loc></url>
    </urlset>`;

    const { folders, routes } = deriveFromSitemap(xml);

    expect(folders).toEqual([]);
    expect(routes).toEqual(['/foo']);
  });
});
