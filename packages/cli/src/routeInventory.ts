import fs from 'node:fs/promises';
import path from 'node:path';
import type { SnapshotRoute } from '@jpmorganchase/mosaic-types';

const GENERATED_FILES = new Set([
  'mosaic-snapshot.json',
  'mosaic-routes.json',
  'shared-config.json',
  'sidebar.json',
  'sitemap.xml',
  'search-records.json',
  'markdown-pages.json',
  'llms.txt',
  'llms-full.txt'
]);

interface RouteInventoryOptions {
  root: string;
  files: string[];
  aliases: string[];
  pageExtensions: string[];
  ignorePages?: string[];
}

const isPublicPath = (value: string) =>
  value.startsWith('/') &&
  !value.includes('\\') &&
  // eslint-disable-next-line no-control-regex
  !/[\x00-\x1f\x7f]/.test(value) &&
  (value === '/' ||
    value
      .slice(1)
      .split('/')
      .every(segment => segment && !segment.startsWith('.')));

/**
 * Enumerate the completed output, not frontmatter or the SEO sitemap. Reading
 * the exported files also observes the CLI's JSON merges and alias collisions.
 * No file contents are parsed and no source ordering is inferred here.
 */
export async function buildRouteInventory({
  root,
  files,
  aliases,
  pageExtensions,
  ignorePages = []
}: RouteInventoryOptions): Promise<SnapshotRoute[]> {
  const snapshotRoot = await fs.realpath(root);
  const eligible = (file: string) =>
    isPublicPath(file) &&
    pageExtensions.some(extension => file.endsWith(extension)) &&
    !ignorePages.some(ignored => file.endsWith(ignored)) &&
    !GENERATED_FILES.has(path.posix.basename(file));
  const diskPath = (file: string) => path.join(snapshotRoot, file);
  const sourcePath = (realPath: string) => {
    const relative = path.relative(snapshotRoot, realPath);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`Snapshot route resolves outside its output directory: ${realPath}`);
    }
    return `/${relative.split(path.sep).join('/')}`;
  };
  const candidates = new Set(files.filter(eligible));
  const visitAlias = async (alias: string, ancestors = new Set<string>()) => {
    if (!isPublicPath(alias)) return;
    let target: string;
    try {
      target = await fs.realpath(diskPath(alias));
    } catch (error) {
      throw new Error(`Snapshot alias '${alias}' is dangling or cyclic`, { cause: error });
    }
    const targetPath = sourcePath(target);
    if ((await fs.stat(target)).isDirectory()) {
      if (ancestors.has(target)) throw new Error(`Snapshot directory alias '${alias}' is cyclic`);
      const nextAncestors = new Set(ancestors).add(target);
      // Walk existing entries, including extensionless/nested aliases. Tracking
      // real directories bounds recursion even when an alias points to a parent.
      for (const entry of await fs.readdir(target))
        await visitAlias(`${alias}/${entry}`, nextAncestors);
      candidates.add(alias);
    } else if (eligible(targetPath)) {
      candidates.add(alias);
    }
  };
  for (const alias of aliases.filter(isPublicPath)) await visitAlias(alias);
  // getMdxRaw accepts /index even when no extensionless alias was emitted.
  for (const file of candidates) {
    if (file.endsWith('/index.mdx')) candidates.add(file.slice(0, -'.mdx'.length));
  }
  for (const file of [...candidates]) {
    for (let folder = path.posix.dirname(file); ; folder = path.posix.dirname(folder)) {
      candidates.add(folder);
      if (folder === '/') break;
    }
  }

  const routes: SnapshotRoute[] = [];
  for (const candidate of candidates) {
    // Match getMdxRaw + loadLocalFile exactly: explicit /index uses .mdx;
    // a directory uses its existing extensionless index alias. In particular,
    // do not invent extensionless routes for arbitrary custom page extensions.
    let target = diskPath(candidate.endsWith('/index') ? `${candidate}.mdx` : candidate);
    try {
      if ((await fs.stat(target)).isDirectory()) target = path.join(target, 'index');
      const realPath = await fs.realpath(target);
      if (!(await fs.stat(realPath)).isFile()) continue;
      const sourcePathname = sourcePath(realPath);
      if (!eligible(sourcePathname)) continue;
      routes.push({
        pathname: candidate.split('/').map(encodeURIComponent).join('/'),
        sourcePathname
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
  }
  return routes.sort((a, b) => (a.pathname < b.pathname ? -1 : a.pathname > b.pathname ? 1 : 0));
}
