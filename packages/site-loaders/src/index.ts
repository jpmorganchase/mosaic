import { load as loadActivePage } from './loadActivePage.js';
import { load as loadSnapshotFile } from './loadSnapshotFile.js';
import type { LoaderPage } from './types/index.js';

const pageLoaders = {
  /** Load pages and update with live changes */
  active: loadActivePage,
  /** Load immutable snapshots of content from the local file-system */
  'snapshot-file': loadSnapshotFile
};

export async function loadPage(route: string): Promise<LoaderPage> {
  const { MOSAIC_MODE: mosaicMode = 'active' } = process.env;
  const loader = pageLoaders[mosaicMode] || pageLoaders.active;
  return await loader(route);
}

export const config = {
  matcher: ['/mosaic/**/*']
};
