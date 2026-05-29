/**
 * Sitemap loader used by App Router `generateStaticParams` in snapshot
 * modes. Reads `sitemap.xml` from the active Mosaic snapshot source
 * (local snapshot dir, or S3 bucket) and returns the list of pathnames
 * relative to the site root (e.g. `/mosaic/index`).
 *
 * Active mode is intentionally unsupported here — static export only makes
 * sense for the snapshot modes where the content is frozen at build time.
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
 * trailing `.mdx`) advertised by the sitemap. Empty array when called in
 * `active` mode or when the sitemap can't be found, so callers can short-
 * circuit safely without crashing the build.
 */
export async function loadSitemap(): Promise<string[]> {
  const { mode } = resolveMosaicMode();
  if (!mode.startsWith('snapshot')) {
    return [];
  }

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
    }
  } catch (err) {
    console.warn(
      '[Mosaic][loadSitemap] Failed to load sitemap.xml; static export will be empty.',
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
