/**
 * Resolve a Mosaic page URL to its **raw on-disk source path**.
 *
 * Why this exists
 * ---------------
 * The Mosaic content server serves the *post-plugin* view of every
 * page: source plugins deserialise the raw `.mdx`/`.json`, then a
 * chain of build plugins enriches each page (`sidebar`,
 * `breadcrumbs`, `tableOfContents`, `sharedConfig`, `readingTime`,
 * plus whatever a host's custom plugins inject) before the page
 * lands in the union volume. The bytes the editor reads via the
 * existing `GET /*` route therefore look nothing like what an
 * author would see if they opened the file in their IDE.
 *
 * For the in-browser editor's Frontmatter tab to be safely
 * editable (without polluting the source repo with regenerated
 * plugin data), it needs to load the *original* file as the
 * author committed it. That's what this resolver — and the
 * `/_mosaic-raw/*` route built on it — provides.
 *
 * Scope of this first slice
 * -------------------------
 * Only `@jpmorganchase/mosaic-source-local-folder` is supported
 * here. That's deliberately the smallest correct surface:
 *
 *   - The source's `options.rootDir` + `options.prefixDir` give
 *     us a complete URL → file mapping with zero IPC and no
 *     changes to the `Source` plugin interface.
 *   - `source-git-repo` and `source-http` need either an exported
 *     `Repo.dir` (for git) or a recursive raw fetch to the
 *     upstream (for http). Both are tractable but bigger
 *     surgeries than this slice; the resolver returns
 *     `unsupported` for them so the editor degrades to read-only
 *     gracefully.
 *
 * The "first match wins, prefixed sources beat unprefixed" rule
 * resolves ambiguity when a config has multiple sources: an
 * explicit `prefixDir` is a stronger claim on a URL space than
 * an unprefixed source, so we prefer it. Within the same
 * prefixedness class we honour declaration order — same rule the
 * union filesystem already uses.
 */

import path from 'node:path';
import type { SourceModuleDefinition } from '@jpmorganchase/mosaic-types';

const LOCAL_FOLDER_MODULE = '@jpmorganchase/mosaic-source-local-folder';

/**
 * Module paths that *would* be supportable once the harder
 * plumbing (worker IPC for `Repo.dir`, recursive raw fetch for
 * `source-http`) is in place. Listed here so the `unsupported`
 * status carries a hint about *why* — useful for debugging in
 * mixed-source configs.
 */
const KNOWN_UNSUPPORTED = new Set([
  '@jpmorganchase/mosaic-source-git-repo',
  '@jpmorganchase/mosaic-source-http',
  '@jpmorganchase/mosaic-source-figma',
  '@jpmorganchase/mosaic-source-storybook',
  '@jpmorganchase/mosaic-source-readme'
]);

interface LocalFolderOptions {
  rootDir: string;
  prefixDir?: string;
  extensions?: string[];
}

export type RawSourceResolution =
  | { kind: 'resolved'; filePath: string; namespace: string }
  | { kind: 'no-matching-source'; url: string }
  | { kind: 'unsupported-source'; modulePath: string; namespace: string };

/**
 * Normalise an incoming URL into the comparison form used by the
 * `prefixDir` match: leading slash, no trailing slash, no double
 * slashes. Empty / root requests collapse to `/`.
 */
function normaliseUrl(url: string): string {
  const cleaned = `/${url}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  return cleaned === '' ? '/' : cleaned;
}

/**
 * Resolve a Mosaic page URL (e.g. `/mosaic/index.mdx`) into the
 * filesystem path of the raw source file, given a Mosaic config.
 *
 * Returns a discriminated result so the caller can give the
 * editor (and future debugging tooling) a precise reason for
 * any non-resolved outcome — `no-matching-source` vs.
 * `unsupported-source` map to different UX in the editor (the
 * latter can suggest "configure source-local-folder for raw
 * editing support" while the former is just "this URL isn't
 * served by any source").
 */
export function resolveRawSourcePath(
  url: string,
  sources: SourceModuleDefinition[]
): RawSourceResolution {
  const normalised = normaliseUrl(url);

  // Order sources so prefixed ones are tried first. Within each
  // class, preserve declaration order so the result matches the
  // union filesystem's "first registered, first served" semantics.
  const prefixed: SourceModuleDefinition[] = [];
  const unprefixed: SourceModuleDefinition[] = [];
  for (const source of sources) {
    if (source.disabled) continue;
    const opts = (source.options ?? {}) as Partial<LocalFolderOptions>;
    if (opts.prefixDir) prefixed.push(source);
    else unprefixed.push(source);
  }

  for (const source of [...prefixed, ...unprefixed]) {
    const opts = (source.options ?? {}) as LocalFolderOptions;
    const prefix = opts.prefixDir ? `/${opts.prefixDir.replace(/^\//, '').replace(/\/$/, '')}` : '';
    // Match the URL against `<prefix>/<rest>` where `<rest>` is
    // non-empty. The trailing-slash on `prefix + '/'` matters:
    // a request for exactly `/mosaic` (no trailing slash, no
    // file) should not match a source whose prefix is `mosaic`
    // — there's no file at that URL.
    if (prefix && !normalised.startsWith(`${prefix}/`)) continue;
    const relative = prefix
      ? normalised.slice(prefix.length).replace(/^\//, '')
      : normalised.replace(/^\//, '');
    if (!relative) continue;

    if (source.modulePath !== LOCAL_FOLDER_MODULE) {
      // The URL *would* be owned by this source if it were
      // supportable; surface why so the caller can render a
      // useful message rather than a generic 404.
      return {
        kind: 'unsupported-source',
        modulePath: source.modulePath,
        namespace: source.namespace
      };
    }

    if (!opts.rootDir) {
      // Misconfigured source — `source-local-folder` requires
      // rootDir. Treat as "no match" rather than throwing so a
      // bad config doesn't take down the raw route for other
      // (well-configured) sources.
      continue;
    }

    // `path.resolve` lets `rootDir` be either absolute (CI-style
    // configs) or relative to the CLI's cwd (the common dev
    // case). `path.join` of an absolute and a relative gives
    // the absolute result either way, but `resolve` is the
    // idiomatic "give me the real path I'd use to read".
    //
    // We deliberately keep the URL's extension verbatim — Mosaic
    // serves with the same extension as on disk, so no
    // extension mapping is needed.
    const filePath = path.resolve(opts.rootDir, relative);

    // Tiny defence-in-depth: if a future caller manages to send
    // a URL with `..` segments that survive normalisation, the
    // resolved path could escape `rootDir`. Re-anchor against
    // the resolved rootDir and refuse anything that doesn't
    // live underneath it.
    const resolvedRoot = path.resolve(opts.rootDir);
    const relCheck = path.relative(resolvedRoot, filePath);
    if (relCheck.startsWith('..') || path.isAbsolute(relCheck)) {
      return { kind: 'no-matching-source', url: normalised };
    }

    return { kind: 'resolved', filePath, namespace: source.namespace };
  }

  return { kind: 'no-matching-source', url: normalised };
}

/**
 * Exposed so future callers (e.g. a debug endpoint, or richer
 * error messages) can introspect the resolver's vocabulary
 * without redeclaring the constants.
 */
export const KNOWN_RAW_UNSUPPORTED_MODULES = KNOWN_UNSUPPORTED;
