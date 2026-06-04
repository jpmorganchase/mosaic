import { concatMap, debounceTime, merge, Observable, of, switchMap } from 'rxjs';
import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import { merge as lodashMerge } from 'lodash-es';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

import fromFsWatch from './fromFsWatch.js';

function createFileGlob(url: string, pageExtensions: string[]) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

/**
 * Per-file cache entry for the incremental deserialise path. Hit when
 * a file's `(mtimeMs, size)` are unchanged between two `fs.watch`
 * emissions — in that case we skip the (expensive) `readFile +
 * serialiser.deserialise` and reuse the previously-built `Page`.
 *
 * Holding the deserialised object directly (not the raw bytes) is the
 * point: the deserialiser is the slow step for MDX (YAML frontmatter
 * parse + body normalisation), and for a typical docs tree dominates
 * the per-emission cost of this Source.
 */
interface CacheEntry {
  mtimeMs: number;
  size: number;
  page: Page;
}

/**
 * Build the canonical `fullPath` (URL-shaped, leading slash, optional
 * namespace prefix) once per filepath. Pulled out only for clarity —
 * the original computation lived inline inside the per-page builder.
 */
function buildFullPath(filepath: string, prefixDir: string | undefined): string {
  const joined = prefixDir ? path.posix.join(prefixDir, filepath) : filepath;
  return `/${joined}`.replace(/^\/{2,}/, '/');
}

export const schema = z.object({
  /**
   * Collection of file extensions to look for
   */
  extensions: z
    .string({ required_error: 'Please provide the collection of file extensions to look for' })
    .array()
    .nonempty(),
  /**
   * Add to use a folder prefix
   */
  prefixDir: z.string().optional(),
  /**
   * The root directory containing docs
   */
  rootDir: z.string({ required_error: 'Please provide a root directory name' })
});

export type LocalFolderSourceOptions = z.infer<typeof schema>;

const LocalFolderSource: Source<LocalFolderSourceOptions> = {
  /**
   * WARNING for upstream consumers: the per-file deserialise cache
   * (`cache` below) is scoped to a single `create()` invocation. If you
   * compose this source under an operator that re-subscribes the
   * returned observable on every tick of a polling stream (e.g.
   * `switchMap(() => watchFolder$)`, `exhaustMap`, …), the cache is
   * thrown away and rebuilt from scratch on every re-subscription,
   * producing the worst possible memory churn and GC pressure on large
   * docs trees. Subscribe once for the lifetime of the source and
   * merge in side-streams as *signals*, not triggers.
   */
  create(options, { serialiser }): Observable<Page[]> {
    validateMosaicSchema(schema, options);

    // Per-`create()` cache, keyed by the relative filepath returned
    // from `glob`. Lives for the lifetime of the Observable's
    // subscription; each `LocalFolderSource` instance gets its own,
    // so it composes cleanly with `prefixDir` / multi-source setups.
    const cache = new Map<string, CacheEntry>();

    return merge(of(null), fromFsWatch(options.rootDir, { recursive: true })).pipe(
      // Coalesce the burst of `rename`/`change` events most editors emit
      // for a single save (atomic write → rename + chmod). 50 ms is below
      // the human-perception threshold while comfortably wider than any
      // editor's write burst.
      debounceTime(50),
      switchMap(() =>
        glob(createFileGlob('**', options.extensions), {
          cwd: options.rootDir,
          onlyFiles: true
        })
      ),
      concatMap(async (filepaths: string[]) => {
        // Stage 1: stat every file in parallel. `stat` is metadata-only
        // (no read) and is the cheap part. Files that vanished between
        // `glob` and `stat` are tolerated by treating the entry as
        // "skip"; the next emission picks up the steady state.
        const stats = await Promise.all(
          filepaths.map(async filepath => {
            const fullPath = path.posix.join(options.rootDir, filepath);
            try {
              const s = await fs.promises.stat(fullPath);
              return { filepath, fullPath, mtimeMs: s.mtimeMs, size: s.size };
            } catch {
              return undefined;
            }
          })
        );

        // Stage 2: reuse the cached `Page` when `(mtimeMs, size)` are
        // unchanged, otherwise do the full read + deserialise. The
        // expensive work is skipped for every unchanged file —
        // typically every file but the one the user just saved.
        //
        // Clone with `lodashMerge({}, ...)` on both branches: downstream
        // plugins mutate the page graph in place, so the cached entry
        // must stay a pristine reference.
        const pages = await Promise.all(
          stats.map(async entry => {
            if (!entry) return undefined;
            const { filepath, fullPath, mtimeMs, size } = entry;
            const cached = cache.get(filepath);
            if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
              return lodashMerge({}, cached.page);
            }

            const data = await fs.promises.readFile(fullPath);
            const deserialised = await serialiser.deserialise(fullPath, data);
            const page = lodashMerge({}, deserialised, {
              lastModified: mtimeMs,
              fullPath: buildFullPath(filepath, options.prefixDir)
            }) as Page;
            cache.set(filepath, { mtimeMs, size, page });
            return lodashMerge({}, page);
          })
        );

        // Stage 3: prune entries for files that disappeared between
        // emissions, so the cache doesn't grow unboundedly across a
        // long dev session.
        const currentSet = new Set(filepaths);
        for (const key of cache.keys()) {
          if (!currentSet.has(key)) cache.delete(key);
        }

        return pages.filter((p): p is Page => p !== undefined);
      })
    );
  }
};

export default LocalFolderSource;
