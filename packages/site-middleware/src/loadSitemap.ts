/**
 * Sitemap loader used by App Router `generateStaticParams` in snapshot
 * modes, and by the App Router `/sitemap.xml` route + New-Page dialog
 * in active mode. Reads `sitemap.xml` from whichever source is
 * authoritative for the current `MOSAIC_MODE`:
 *
 *   - `snapshot-file` → local snapshot dir on disk
 *   - `snapshot-s3`   → configured S3 bucket
 *   - `active`        → the live Mosaic FS server at
 *     `MOSAIC_ACTIVE_MODE_URL/sitemap.xml`
 *
 * Returns pathnames relative to the site root (e.g. `/mosaic/index`).
 * Failure is non-fatal — an empty array lets callers degrade
 * gracefully (the App Router catch-all already 404s unknown routes,
 * the New-Page combobox falls back to free-text).
 */
import path from 'path';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';

import {
  createS3Loader,
  getSnapshotFileConfig,
  getSnapshotS3Config,
  loadLocalFile
} from './loaders/index.js';

/** Read the resolved Mosaic mode + content URL from env. */
export function resolveMosaicMode(): { mode: MosaicMode; contentUrl: string } {
  const mode: MosaicMode = (process.env.MOSAIC_MODE || 'active') as MosaicMode;
  const contentUrl = process.env[`MOSAIC_${mode.toUpperCase()}_MODE_URL`] || '';
  return { mode, contentUrl };
}

/**
 * Returns the list of routes (pathnames with a leading `/`, no origin, no
 * trailing `.mdx`) advertised by the sitemap. Empty array when the sitemap
 * source can't be reached, so callers can short-circuit safely without
 * crashing the build / the request.
 *
 * Source per mode:
 *   - `snapshot-file` → `<snapshotDir>/sitemap.xml` on disk;
 *   - `snapshot-s3`   → `sitemap.xml` in the configured S3 bucket;
 *   - `active`        → live `${MOSAIC_ACTIVE_MODE_URL}/sitemap.xml`
 *                       served by the Mosaic FS server. This is the only
 *                       view the New-Page dialog has of the namespace
 *                       tree in dev, so omitting it would leave the
 *                       parent-folder ComboBox suggestion list empty.
 */
export async function loadSitemap(): Promise<string[]> {
  const { mode, contentUrl } = resolveMosaicMode();

  let xml: string | null = null;
  try {
    if (mode === 'snapshot-file') {
      const { snapshotDir } = getSnapshotFileConfig('sitemap.xml');
      const fullPath = path.posix.join(process.cwd(), snapshotDir, 'sitemap.xml');
      xml = await loadLocalFile(fullPath);
    } else if (mode === 'snapshot-s3') {
      const { bucket, region, accessKeyId, secretAccessKey } = getSnapshotS3Config('sitemap.xml');
      const { loadKey, keyExists } = createS3Loader(region, accessKeyId, secretAccessKey);
      if (await keyExists(bucket, 'sitemap.xml')) {
        xml = await loadKey(bucket, 'sitemap.xml');
      }
    } else if (mode === 'active') {
      // Active mode: the live Mosaic FS server is the only source of
      // truth for what pages exist right now (the snapshot on disk may
      // be stale or absent). Mosaic serves a `sitemap.xml` at the FS
      // server root, so reuse it instead of inventing a new listing
      // endpoint. Failure here is non-fatal — both call sites (the App
      // Router `/sitemap.xml` route and the New-Page dialog's folder
      // suggestions) treat an empty list as a degraded but working
      // state.
      if (!contentUrl) return [];
      // `cache: 'no-store'` — the sitemap reflects the upstream's
      // *current* set of routes. Caching the result at Next.js's
      // built-in fetch layer would cause two pathologies in active
      // mode:
      //
      //   1. A cold-start failure (CLI booting, not yet listening or
      //      not yet content-ready) would be memoised and re-served
      //      for every subsequent sitemap request, perpetuating an
      //      empty navigation tree even after the CLI comes online.
      //   2. A successful sitemap from boot-time would be served
      //      stale forever as the author adds/removes pages.
      //
      // The sitemap is small (kilobytes) and only consulted by the
      // `/sitemap.xml` route + the New-Page dialog — both
      // low-frequency paths — so the per-render cost is negligible.
      const response = await fetch(`${contentUrl}/sitemap.xml`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`sitemap.xml: HTTP ${response.status}`);
      }
      xml = await response.text();
    }
  } catch (err) {
    console.warn(
      '[Mosaic][Middleware] Failed to load sitemap.xml; falling back to empty list.',
      err instanceof Error ? err.message : err
    );
    return [];
  }

  if (!xml) return [];
  return parseSitemapXml(xml);
}

/**
 * Tolerant sitemap parser — extracts `<loc>...</loc>` values and reduces them
 * to host-stripped pathnames. We deliberately avoid pulling in a full XML
 * parser; the format is well known and stable (sitemaps.org schema), and
 * `SiteMapPlugin` produces a flat `<url><loc/></url>` shape.
 */
export function parseSitemapXml(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const raw = match[1];
    let pathname: string;
    try {
      // Sitemap entries are absolute URLs (siteUrl + route).
      pathname = new URL(raw).pathname;
    } catch {
      // Defensive fallback for already-relative entries.
      pathname = raw.startsWith('/') ? raw : `/${raw}`;
    }
    if (pathname) out.push(pathname);
  }
  return out;
}
