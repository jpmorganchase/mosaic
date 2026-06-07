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
 * Supported sources
 * -----------------
 * Two source kinds resolve to an on-disk file today:
 *
 *   - `@jpmorganchase/mosaic-source-local-folder` — trivial:
 *     `options.rootDir + options.prefixDir` give us a complete
 *     URL → file mapping with zero IPC.
 *   - `@jpmorganchase/mosaic-source-git-repo` — the source's
 *     worker clones the repo into a deterministic location
 *     (`<cwd>/.tmp/.cloned_docs/<project>/<repo>/.mosaic-worktrees/<branch>`)
 *     before emitting pages. We re-derive that path here via
 *     the source's exported `getWorktreeDir(repoUrl, branch)`
 *     helper — same formula as the worker, so no IPC is
 *     needed. Combined with `options.subfolder` (the docs root
 *     inside the repo) the lookup matches the worker's view of
 *     the filesystem byte-for-byte.
 *
 * Other source kinds (`source-http`, `source-figma`,
 * `source-storybook`, …) remain in `KNOWN_UNSUPPORTED` — they
 * need either a recursive raw fetch to an upstream (http) or
 * don't have a meaningful "on-disk source" concept (figma,
 * storybook). The resolver returns `unsupported-source` for
 * them so the editor degrades to read-only gracefully.
 *
 * Race against worker init
 * ------------------------
 * The git-repo source's worker clones + checks out the worktree
 * asynchronously after the CLI boots. A raw fetch that lands
 * before the worktree exists hits `ENOENT` on
 * `fs.promises.stat`, which the Fastify handler maps to a plain
 * 404. The editor's `MdxRawSourceResult` already treats that as
 * `not-found` and shows the user a "the source file couldn't be
 * found" banner — same UX as a real mid-rename race. No special
 * handling needed in the resolver itself.
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
import { getWorktreeDir } from '@jpmorganchase/mosaic-source-git-repo';

const LOCAL_FOLDER_MODULE = '@jpmorganchase/mosaic-source-local-folder';
const GIT_REPO_MODULE = '@jpmorganchase/mosaic-source-git-repo';

/**
 * Module paths that *can't* (or don't usefully) resolve to a raw
 * on-disk file. Listed here so the `unsupported-source` status
 * carries a hint about *which* source kind owned the URL —
 * useful for debugging in mixed-source configs and for the
 * editor's per-kind banner copy.
 *
 * `source-git-repo` is intentionally absent: it resolves to the
 * worker's worktree directory via the `GIT_REPO_MODULE` branch
 * below. `source-http` could be made resolvable in principle by
 * recursing the upstream raw route, but that needs more design
 * work than the in-process git case.
 */
const KNOWN_UNSUPPORTED = new Set([
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

/**
 * Minimal shape of the git-repo source's options surface that
 * this resolver cares about. The full zod schema lives in
 * `@jpmorganchase/mosaic-source-git-repo/src/index.ts`;
 * duplicating the few fields we read keeps this module free of
 * an import on the source's runtime schema definition (which
 * pulls in zod for type-only use).
 */
interface GitRepoOptions {
  repo: string;
  branch: string;
  subfolder: string;
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
 * latter can point at the offending source kind so the author
 * knows whether to switch to a supported source or just accept
 * the read-only frontmatter view).
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
    const opts = (source.options ?? {}) as Partial<LocalFolderOptions & GitRepoOptions>;
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

    // Resolve the source's effective on-disk rootDir. Each
    // supported source kind exposes the path differently:
    //   - local-folder: literal `options.rootDir`.
    //   - git-repo: derived from `(repo, branch)` via the
    //     source's exported `getWorktreeDir` helper, then
    //     joined with `options.subfolder` to land at the docs
    //     root inside the cloned worktree.
    // Unsupported source kinds return `unsupported-source` so
    // the editor can render a precise per-kind banner.
    let rootDir: string | undefined;
    if (source.modulePath === LOCAL_FOLDER_MODULE) {
      rootDir = opts.rootDir;
    } else if (source.modulePath === GIT_REPO_MODULE) {
      if (opts.repo && opts.branch && opts.subfolder) {
        // `getWorktreeDir` is pure and uses `process.cwd()` by
        // default — same cwd the source worker runs under (the
        // CLI's parent process and its worker subprocesses
        // inherit the working directory). The path it returns
        // therefore points at the exact worktree the worker
        // checks out, so a `readFile` here sees the same bytes
        // the source pipeline sees.
        //
        // The helper throws on a malformed `repo` URL (e.g.
        // missing `.git` suffix, not a parseable URL). Swallow
        // the throw and fall through to "no match" — a bad
        // config shouldn't take down the raw route for sibling
        // sources, and the same misconfig will surface
        // elsewhere (the source's own zod validation rejects
        // it at boot).
        try {
          const worktreeDir = getWorktreeDir(opts.repo, opts.branch);
          rootDir = path.join(worktreeDir, opts.subfolder);
        } catch {
          rootDir = undefined;
        }
      }
    } else {
      // The URL *would* be owned by this source if it were
      // supportable; surface why so the caller can render a
      // useful message rather than a generic 404.
      return {
        kind: 'unsupported-source',
        modulePath: source.modulePath,
        namespace: source.namespace
      };
    }

    if (!rootDir) {
      // Misconfigured source — local-folder requires `rootDir`,
      // git-repo requires `(repo, branch, subfolder)`. Treat as
      // "no match" rather than throwing so a bad config doesn't
      // take down the raw route for other (well-configured)
      // sources.
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
    const filePath = path.resolve(rootDir, relative);

    // Tiny defence-in-depth: if a future caller manages to send
    // a URL with `..` segments that survive normalisation, the
    // resolved path could escape `rootDir`. Re-anchor against
    // the resolved rootDir and refuse anything that doesn't
    // live underneath it.
    const resolvedRoot = path.resolve(rootDir);
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





