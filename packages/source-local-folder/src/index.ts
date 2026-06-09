import { concatMap, debounceTime, merge, Observable, of, switchMap } from 'rxjs';
import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
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
 *
 * The cached `page` is treated as **immutable**: every consumer of the
 * cache receives a `structuredClone` so plugin mutations to a returned
 * page (e.g. `page.sharedConfig =`, `page.tags.push(…)`) cannot bleed
 * back into the cache and re-emit on the next tick. `lodash.merge({},
 * page)` was the previous strategy and was load-bearing only by
 * accident — `merge` recurses into plain objects but assigns nested
 * arrays / non-plain objects by reference, so the no-mutation
 * invariant held purely because every plugin we shipped happened to
 * only mutate top-level fields. `structuredClone` makes the invariant
 * unconditional.
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

/**
 * Run `worker` over `items` with an upper bound on in-flight promises.
 *
 * `Promise.all(items.map(worker))` over a very large docs tree
 * (thousands of MDX files) holds all parsed `Page` objects in memory
 * simultaneously, because `Promise.all` resolves all results together
 * before the next pipeline step can drain them. The libuv thread pool
 * caps the *concurrent* fs reads at 4 by default, but JS micro-tasks
 * drain bursty — when 4 reads complete simultaneously, 4 synchronous
 * deserialise steps run back-to-back. Bounding the queue here keeps
 * peak Page accumulation predictable on giant trees without measurably
 * changing throughput on typical Mosaic sites (~hundreds of files),
 * where the bound is never reached.
 *
 * Insurance, not a fix for any observed Mosaic-site regression — keep
 * it if you might consume monorepo-scale docs trees, drop it if the
 * extra ~20 lines aren't worth the future-proofing.
 */
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

const READ_CONCURRENCY = 16;
const STAT_CONCURRENCY = 64;

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
        // Stage 1: stat every file. `stat` is metadata-only (no read)
        // and libuv caps the actual concurrent stats at its thread-pool
        // size (4 by default), so the `STAT_CONCURRENCY` ceiling is
        // mostly there to keep the in-memory queue of pending closures
        // bounded on giant trees rather than to control I/O parallelism.
        // Files that vanished between `glob` and `stat` are tolerated
        // by treating the entry as "skip"; the next emission picks up
        // the steady state.
        const stats = await mapWithConcurrency(filepaths, STAT_CONCURRENCY, async filepath => {
          const fullPath = path.posix.join(options.rootDir, filepath);
          try {
            const s = await fs.promises.stat(fullPath);
            return { filepath, fullPath, mtimeMs: s.mtimeMs, size: s.size };
          } catch {
            return undefined;
          }
        });

        // Stage 2: reuse the cached `Page` when `(mtimeMs, size)` are
        // unchanged, otherwise do the full read + deserialise. The
        // expensive work is skipped for every unchanged file —
        // typically every file but the one the user just saved.
        //
        // `structuredClone` rather than `lodash.merge({}, …)`: see the
        // `CacheEntry` comment for the rationale.
        const pages = await mapWithConcurrency(stats, READ_CONCURRENCY, async entry => {
          if (!entry) return undefined;
          const { filepath, fullPath, mtimeMs, size } = entry;
          const cached = cache.get(filepath);
          if (cached && cached.mtimeMs === mtimeMs && cached.size === size) {
            return structuredClone(cached.page);
          }

          const data = await fs.promises.readFile(fullPath);
          const deserialised = (await serialiser.deserialise(fullPath, data)) as Page;
          // The cache holds the canonical (pre-clone) page; consumers
          // always receive a `structuredClone` of it on every emission.
          //
          // `lastModified` is typed as `Date` upstream but we assign a
          // number (`mtimeMs`) — `lodash.merge` accepted this silently
          // and the rest of the pipeline downstream depends on the
          // number shape, so we preserve it via an explicit cast
          // rather than quietly fixing the type and breaking consumers.
          const page = {
            ...deserialised,
            lastModified: mtimeMs,
            fullPath: buildFullPath(filepath, options.prefixDir)
          } as unknown as Page;
          cache.set(filepath, { mtimeMs, size, page });
          return structuredClone(page);
        });

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
