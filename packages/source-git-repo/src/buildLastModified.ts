import path from 'node:path';
import { merge as lodashMerge } from 'lodash-es';
import type { Page } from '@jpmorganchase/mosaic-types';
import type Repo from './Repo.js';

/**
 * Build the `pages` array enriched with `lastModified` for the current
 * emission. Capture one revision for both the bulk lookup and any
 * missing paths, so cached pages do not each launch `git rev-parse`.
 */
export default async function buildLastModified(
  repo: Repo,
  rootDir: string,
  prefixDir: string | undefined,
  pages: Page[]
): Promise<Page[]> {
  if (!pages.length) return pages;

  const subfolderRel = path.relative(repo.dir, rootDir).split(path.sep).join('/') || '.';
  const revision = await repo.currentLocalRevision();
  const dates = await repo.getLatestCommitDateMap(subfolderRel, revision);

  const out: Page[] = [];
  for (const page of pages) {
    const baseDir = path.join(rootDir, page.fullPath.replace(prefixDir || '', ''));
    const relPath = path.relative(repo.dir, baseDir).split(path.sep).join('/');
    out.push(
      lodashMerge({}, page, {
        lastModified: dates.get(relPath) ?? (await repo.getLatestCommitDate(relPath, revision))
      })
    );
  }
  return out;
}
