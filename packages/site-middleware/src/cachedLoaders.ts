/**
 * Request-memoized content loaders with optional persistent Next data caching.
 * Independent MDX and shared-config reads can run in parallel. Cache entries
 * share the Mosaic content tag for webhook-driven invalidation. Search records
 * are loaded independently by the search handler or the browser search client.
 * Server-only.
 */
import fs from 'fs';
import path from 'path';
import { createHash } from 'node:crypto';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { parseFrontmatter as parseFrontmatterBlock } from '@jpmorganchase/mosaic-serialisers/frontmatter';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import type { SharedConfig } from '@jpmorganchase/mosaic-store';

import { loadLocalFile } from './loaders/index.js';
import { MOSAIC_CONTENT_CACHE_TAG } from './cacheTags.js';
import { getSnapshotIdentity, getSnapshotRoot, type SnapshotIdentity } from './snapshotIdentity.js';

if (typeof window !== 'undefined') {
  throw new Error('cachedLoaders.ts must not be imported on the client.');
}

/**
 * Re-export so existing callers can continue to import this constant
 * from `cachedLoaders`. New callers (notably the `/api/revalidate`
 * route handler) should import from `./cacheTags.js` directly so
 * Next.js' NFT trace doesn't pull in this file's fs dependencies.
 * The Mosaic CLI (or a CMS webhook) can mark every entry stale at
 * once with `revalidateTag(MOSAIC_CONTENT_CACHE_TAG)` — see
 * `packages/site/src/app/api/revalidate/route.ts`.
 */
export { MOSAIC_CONTENT_CACHE_TAG };

/**
 * Dev escape hatch. Setting `MOSAIC_DISABLE_LOADER_CACHE=true` makes
 * every loader bypass `unstable_cache` (the request-scoped `cache()`
 * still runs — that's per-render and safe). Use when iterating on
 * snapshot content locally and you don't want to remember to hit the
 * revalidate endpoint after every change.
 */
const cacheDisabled = process.env.MOSAIC_DISABLE_LOADER_CACHE === 'true';

/**
 * Active mode skips the cross-request cache by default: every request
 * reads from the live Mosaic CLI, so edits show up immediately. Set
 * `MOSAIC_ACTIVE_MODE_CACHE=true` to cache active-mode reads too; entries
 * are then invalidated by the CLI's revalidate notifier
 * (`MOSAIC_REVALIDATE_URL` / `MOSAIC_REVALIDATE_SECRET`). Only enable it
 * when that notification reaches every site instance (a single instance,
 * or a shared cache handler) — otherwise instances serve stale content.
 *
 * Identified snapshots cache by root and generation. Older snapshots without
 * valid identity metadata retain request memoization but bypass this layer.
 */
const activeModeCacheEnabled = process.env.MOSAIC_ACTIVE_MODE_CACHE === 'true';

function bypassesCrossRequestCache(mode: MosaicMode): boolean {
  return mode === 'active' && !activeModeCacheEnabled;
}

/**
 * Thrown from inside the cached function to hand a negative result back
 * without storing it — `unstable_cache` never stores rejections.
 */
class UncachedResult<T> extends Error {
  constructor(readonly value: T) {
    super('[Mosaic] uncached loader result');
  }
}

/**
 * Wraps a loader in `unstable_cache` (tagged `MOSAIC_CONTENT_CACHE_TAG`,
 * valid until invalidated), except in the cases above.
 *
 * Results rejected by `isCacheable` — not-found pages, missing files,
 * empty lookups — are returned but never stored. That keeps a cold-start
 * 404 (CLI listening, content not loaded yet) from sticking for the
 * process lifetime, and stops requests for arbitrary URLs from growing
 * the cache without bound.
 *
 * `getMode` extracts the mode from the loader's argument tuple —
 * different loaders have different arg shapes so the extractor is
 * passed in. The cached function is created once so its identity stays
 * stable across calls.
 */
function withCrossRequestCache<TArgs extends unknown[], TResult>(
  impl: (...args: TArgs) => Promise<TResult>,
  keyParts: string[],
  getMode: (args: TArgs) => MosaicMode,
  isCacheable: (result: TResult) => boolean,
  { readsSnapshot = false }: { readsSnapshot?: boolean } = {}
): (...args: TArgs) => Promise<TResult> {
  if (cacheDisabled) return impl;
  const cached = unstable_cache(
    async (_snapshotIdentity: SnapshotIdentity | null, ...args: TArgs) => {
      const result = await impl(...args);
      if (!isCacheable(result)) throw new UncachedResult(result);
      return result;
    },
    keyParts,
    { tags: [MOSAIC_CONTENT_CACHE_TAG] }
  );
  return async (...args: TArgs) => {
    const mode = getMode(args);
    if (bypassesCrossRequestCache(mode)) return impl(...args);
    // Editor-only loaders return fixed unavailable/empty results in snapshot
    // mode. They need neither a snapshot directory nor its identity metadata.
    if (mode === 'snapshot-file' && !readsSnapshot) return impl(...args);
    const identity = mode === 'snapshot-file' ? await getSnapshotIdentity() : null;
    if (identity === undefined) return impl(...args);
    try {
      return await cached(identity, ...args);
    } catch (error) {
      if (error instanceof UncachedResult) return error.value as TResult;
      throw error;
    }
  };
}

// ---------------------------------------------------------------------------
// Shared-config loader
// ---------------------------------------------------------------------------

/**
 * Derive the subtree path the shared-config lives under. The legacy
 * regex (`/(.*)[!/]/`) consumes everything up to the last `/` or `!`,
 * which on `/mosaic/getting-started/index` yields `/mosaic/getting-started`.
 * Preserved verbatim so behaviour matches the middleware path.
 */
function deriveSharedConfigUrlPath(pathname: string): string {
  const matches = pathname.match(/(.*)[!/]/);
  return matches?.length ? matches[1] : '';
}

/**
 * Route params reach the loaders percent-encoded (`/docs/a%20b`), but
 * snapshot files use the decoded name (`docs/a b`).
 *
 * Returns `undefined` for malformed encodings and for paths that, once
 * decoded, could step outside the snapshot: `.`/`..` segments (for
 * example from an encoded `..%2F`), backslashes and NUL bytes. Callers
 * treat that as "not found".
 */
function decodeSnapshotPath(urlPath: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return undefined;
  }
  if (decoded.includes('\\') || decoded.includes('\0')) return undefined;
  if (decoded.split('/').some(segment => segment === '.' || segment === '..')) return undefined;
  return decoded;
}

function safeJsonParse<T = unknown>(raw: string | null | undefined, source: string): T | undefined {
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (trimmed === '') return undefined;
  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON at ${source}: ${message}`);
  }
}

const loadSharedConfigImpl = async (
  urlPath: string,
  mode: MosaicMode,
  contentUrl: string
): Promise<SharedConfig | undefined> => {
  if (mode === 'snapshot-file') {
    const snapshotPath = decodeSnapshotPath(urlPath);
    if (snapshotPath === undefined) return undefined;
    const filePath = path.join(getSnapshotRoot(), snapshotPath, 'shared-config.json');
    try {
      await fs.promises.stat(filePath);
    } catch {
      return undefined;
    }
    const raw = await loadLocalFile(filePath);
    const parsed = safeJsonParse<{ config: SharedConfig }>(raw, filePath);
    return parsed?.config;
  }

  // Active mode — HTTP fetch from the running mosaic server.
  // `cache: 'no-store'` opts out of Next's built-in fetch cache: that
  // layer is below `unstable_cache`, so without this the raw fetch
  // result — including any cold-start 404 — would be memoised at the
  // fetch layer even when `withCrossRequestCache` bypasses (or refuses
  // to store) it.
  const response = await fetch(`${contentUrl}${urlPath}/shared-config.json`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.ok) {
    const parsed = (await response.json()) as { config: SharedConfig };
    return parsed.config;
  }
  if (response.status === 404) return undefined;
  throw new Error(
    `Failed to load shared config from ${contentUrl}${urlPath}: ${response.status} ${response.statusText}`
  );
};

const loadSharedConfigCached = withCrossRequestCache(
  loadSharedConfigImpl,
  ['mosaic', 'sharedConfig'],
  // Loader signature: `(urlPath, mode, contentUrl)`. The mode is
  // the second arg; extract for the cross-request cache gate.
  ([, mode]) => mode,
  config => config !== undefined,
  { readsSnapshot: true }
);

/**
 * Resolve the per-route shared config (header, footer,
 * etc.). Cached at the subtree level (e.g. `/mosaic/getting-started`)
 * so neighbour pages share the lookup, and requests for made-up pages
 * don't each add a cache entry.
 */
export const getSharedConfig = cache(
  async (pathname: string, mode: MosaicMode, contentUrl: string) =>
    loadSharedConfigCached(deriveSharedConfigUrlPath(pathname), mode, contentUrl)
);

// ---------------------------------------------------------------------------
// MDX raw-text loader
// ---------------------------------------------------------------------------

/**
 * "Redirect" envelope from the active-mode upstream. The mosaic server
 * returns HTTP 302 with a JSON body `{ redirect: '/new/path' }` to
 * indicate that a path resolves elsewhere (e.g. directory → index).
 * We propagate that to the caller so `page.tsx` can call
 * `redirect(destination)`.
 *
 * The MDX success case carries both the raw text (consumed by
 * `<BodyServer />` for the eventual `serializeMdxForClient` call) and
 * the parsed frontmatter — pre-parsing here means `generateMetadata`
 * and the page render share one frontmatter parse instead of each
 * doing its own.
 */
export type MdxLoadResult =
  | { kind: 'mdx'; raw: string; frontmatter: Record<string, unknown> }
  | { kind: 'redirect'; destination: string }
  | { kind: 'not-found' };

function normalizeMdxUrl(url: string): string {
  return /\/index$/.test(url) ? `${url}.mdx` : url;
}

/**
 * Parse only the YAML frontmatter from raw MDX. `parseFrontmatter` is
 * regex+YAML — much cheaper than running the full MDX compiler just to
 * read the header block.
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  try {
    const { data } = parseFrontmatterBlock(raw);
    return data ?? {};
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Don't fail the whole load over malformed frontmatter; metadata
    // will just be empty and the MDX compile (which has its own
    // tolerant parser) will surface the real error.
    console.warn(`[Mosaic] Could not parse frontmatter: ${message}`);
    return {};
  }
}

const loadMdxRawImpl = async (
  pathname: string,
  mode: MosaicMode,
  contentUrl: string
): Promise<MdxLoadResult> => {
  const normalized = normalizeMdxUrl(pathname);

  if (mode === 'snapshot-file') {
    const snapshotPath = decodeSnapshotPath(normalized);
    if (snapshotPath === undefined) return { kind: 'not-found' };
    const filePath = path.join(getSnapshotRoot(), snapshotPath);
    try {
      const raw = await loadLocalFile(filePath);
      return { kind: 'mdx', raw, frontmatter: parseFrontmatter(raw) };
    } catch {
      return { kind: 'not-found' };
    }
  }

  // Active mode. `cache: 'no-store'` — see the equivalent comment
  // in `loadSharedConfigImpl`. The dominant cost (avoiding a refetch
  // of the same page within one render) is handled by the
  // request-scoped `cache()` wrapper around `getMdxRaw` below.
  const response = await fetch(`${contentUrl}${normalized}`, { cache: 'no-store' });
  if (response.ok) {
    const raw = await response.text();
    return { kind: 'mdx', raw, frontmatter: parseFrontmatter(raw) };
  }
  if (response.status === 302) {
    const body = (await response.json()) as { redirect: string };
    return { kind: 'redirect', destination: body.redirect };
  }
  if (response.status === 404) return { kind: 'not-found' };
  throw new Error(
    `Failed to load MDX from ${contentUrl}${normalized}: ${response.status} ${response.statusText}`
  );
};

const loadMdxRawCached = withCrossRequestCache(
  loadMdxRawImpl,
  ['mosaic', 'mdx'],
  // Loader signature: `(pathname, mode, contentUrl)`. Mode is the
  // second arg.
  ([, mode]) => mode,
  // Never store a 404: it may be a cold start, or a probe for a random URL.
  result => result.kind !== 'not-found',
  { readsSnapshot: true }
);

/**
 * Resolve the raw MDX text for a route. Returns one of three
 * discriminated outcomes so the caller can dispatch to `redirect()` /
 * `notFound()` / render without needing to inspect HTTP status codes.
 *
 * Caching note: identified snapshots cache raw text by root and generation;
 * rebuilding the snapshot creates a new identity and fresh entries. Active
 * mode only does so with `MOSAIC_ACTIVE_MODE_CACHE=true`, and 404s are
 * never stored — see `withCrossRequestCache`. The per-request
 * `cache()` wrapper below still dedupes a `generateMetadata` +
 * page render pair into a single fetch.
 */
export const getMdxRaw = cache(async (pathname: string, mode: MosaicMode, contentUrl: string) =>
  loadMdxRawCached(pathname, mode, contentUrl)
);

// ---------------------------------------------------------------------------
// MDX raw-source (pre-plugin) loader
// ---------------------------------------------------------------------------

/**
 * Outcomes of a raw-source fetch.
 *
 * The Mosaic CLI's `/_mosaic-raw/*` route returns the bytes of a
 * page **as they exist on the source filesystem**, before any
 * plugin has touched them. Multiple non-success paths matter
 * separately to the editor:
 *
 *   - `raw`: success — the editor can show authored frontmatter
 *     in the Frontmatter tab and (later) round-trip authored
 *     edits back through the workflow.
 *   - `unsupported-source`: the URL is owned by a source kind
 *     the CLI's raw route doesn't yet support (today: anything
 *     other than `source-local-folder`). The editor renders a
 *     precise "frontmatter editing requires source-local-folder"
 *     hint and stays read-only.
 *   - `no-matching-source`: no configured source claims this
 *     URL — the page is virtual / synthesised. Editor renders a
 *     "this page has no on-disk source" hint.
 *   - `not-found`: matching source exists but the file is missing
 *     (mid-rename, deleted, race with `fs.watch`). Editor should
 *     retry on next mount.
 *   - `unavailable-in-mode`: the deployment isn't in active mode
 *     (snapshot dirs hold post-plugin bytes, not raw source —
 *     misleading to surface those as "raw").
 *
 * The discriminator mirrors the CLI's `X-Mosaic-Raw-Status`
 * header vocabulary so debugging tooling and the editor's UX
 * messages share one set of names.
 */
export type MdxRawSourceResult =
  | { kind: 'raw'; bytes: string; namespace: string | undefined; sourceHash?: string }
  | { kind: 'not-found' }
  | { kind: 'no-matching-source' }
  | { kind: 'unsupported-source'; modulePath: string | undefined }
  | { kind: 'unavailable-in-mode'; mode: MosaicMode };

const RAW_ROUTE_PREFIX = '/_mosaic-raw';

/**
 * Normalise a route pathname into the on-disk filename the
 * CLI's `/_mosaic-raw/*` route expects.
 *
 * Stricter than {@link normalizeMdxUrl} (which only fixes
 * `/foo/index` → `/foo/index.mdx`) because the regular content
 * route accepts both the extensionless and the `.mdx` form,
 * but the raw-source route only matches the exact on-disk
 * filename. Without this, any page authored as
 * `<route>.mdx` (i.e. anything that isn't an `index` file)
 * comes back as a CLI 404 and the editor renders the
 * "source file couldn't be found on disk" fallback even
 * though the file is present and readable.
 *
 * Treats `.mdx` and `.md` as already-normalised; everything
 * else gets `.mdx` appended (Mosaic content is overwhelmingly
 * `.mdx`, so it's the right default). The `/index` trailing
 * segment still resolves correctly because the `.mdx` append
 * happens regardless of suffix shape — `/foo/index` becomes
 * `/foo/index.mdx`, matching the regular {@link normalizeMdxUrl}
 * output.
 */
function normalizeRawMdxUrl(url: string): string {
  if (/\.mdx?$/i.test(url)) return url;
  return `${url}.mdx`;
}

const loadMdxRawSourceImpl = async (
  pathname: string,
  mode: MosaicMode,
  contentUrl: string
): Promise<MdxRawSourceResult> => {
  // Snapshot mode serves the post-plugin VFS — there's no
  // "raw source" concept on the snapshot side. Returning a
  // distinct status (rather than falling through to a 404)
  // lets the editor render a clear "raw source unavailable in
  // snapshot mode" hint instead of guessing.
  if (mode === 'snapshot-file') {
    return { kind: 'unavailable-in-mode', mode };
  }

  const normalized = normalizeRawMdxUrl(pathname);
  // `cache: 'no-store'` — same rationale as the other active-mode
  // fetches; the editor only consults this on initial editor mount
  // per page, so the per-request `cache()` wrapper is enough.
  const response = await fetch(`${contentUrl}${RAW_ROUTE_PREFIX}${normalized}`, {
    cache: 'no-store'
  });

  if (response.ok) {
    const raw = await response.arrayBuffer();
    const namespace = response.headers.get('x-mosaic-raw-namespace') ?? undefined;
    return {
      kind: 'raw',
      bytes: new TextDecoder().decode(raw),
      namespace,
      sourceHash: createHash('sha256').update(new Uint8Array(raw)).digest('hex')
    };
  }

  if (response.status === 404) {
    // The CLI sets `X-Mosaic-Raw-Status` to distinguish the
    // three 404 sub-cases; map each one onto our discriminated
    // result so callers don't have to parse headers themselves.
    const status = response.headers.get('x-mosaic-raw-status');
    if (status === 'unsupported-source') {
      return {
        kind: 'unsupported-source',
        modulePath: response.headers.get('x-mosaic-raw-module') ?? undefined
      };
    }
    if (status === 'no-matching-source') {
      return { kind: 'no-matching-source' };
    }
    // Header missing OR `not-a-file` / plain not-found —
    // collapse to a single "the file isn't there" status.
    return { kind: 'not-found' };
  }

  throw new Error(
    `Failed to load raw MDX from ${contentUrl}${RAW_ROUTE_PREFIX}${normalized}: ${response.status} ${response.statusText}`
  );
};

/**
 * Resolve the **raw on-disk source** for a route, bypassing the
 * Mosaic plugin pipeline. See {@link MdxRawSourceResult} for the
 * outcome shape.
 *
 * Deduplicate within one request. Reopening the editor after a save conflict
 * must read the current authored file even if page views use persistent
 * active-mode caching.
 *
 * Note: snapshot deployments return `unavailable-in-mode` —
 * snapshots hold post-plugin VFS bytes, not raw source. The
 * editor branch is only reachable on dynamic (active) builds
 * with a signed-in user, so this is the expected combination
 * in practice.
 */
export const getMdxRawSource = cache(loadMdxRawSourceImpl);

// ---------------------------------------------------------------------------
// Tag-suggestions loader
// ---------------------------------------------------------------------------

/**
 * Path on the Mosaic CLI's admin API that lists the union FS's
 * `/.tags/<tag>/...` directory names — i.e. every tag any source
 * has emitted. The prefix matches `MOSAIC_ADMIN_PREFIX` over in
 * `packages/cli/src/serve.ts`; we hard-code the literal here (vs
 * importing) to keep the middleware free of a CLI runtime
 * dependency.
 */
const TAGS_LIST_PATH = '/_mosaic_/tags/list';

const loadTagSuggestionsImpl = async (
  mode: MosaicMode,
  contentUrl: string
): Promise<readonly string[]> => {
  // Snapshot mode doesn't ship a `/.tags` enumeration endpoint —
  // the snapshot dir holds the post-plugin VFS bytes but no
  // sidecar listing. Returning `[]` (rather than throwing or a
  // distinct status) lets the host wire `<TagSuggestionsProvider>`
  // unconditionally: in snapshot mode authors get a free-text
  // ComboBox with an empty dropdown, in active mode they get
  // typeahead — same affordance, graceful degradation.
  if (mode === 'snapshot-file') {
    return [];
  }

  // Active mode. No `contentUrl` → no upstream to ask; return
  // empty rather than throwing so the editor mount still works
  // (degraded autocomplete only).
  if (!contentUrl) return [];

  try {
    // `cache: 'no-store'` — same rationale as the other
    // active-mode fetches in this file. The tag list is
    // small (tens of names), only consulted on editor mount
    // per page, so the per-render `cache()` wrapper is enough
    // and we want every editor mount to see the freshest list
    // (a newly-saved tag should appear on the next mount, not
    // wait out an arbitrary cache TTL).
    const response = await fetch(`${contentUrl}${TAGS_LIST_PATH}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) return [];
    const parsed = (await response.json()) as unknown;
    if (!Array.isArray(parsed)) return [];
    // Defensive: filter to strings only. The endpoint already
    // returns `string[]`, but the type assertion above is at
    // the trust boundary and we'd rather drop a stray non-string
    // than ship one downstream as a ComboBox `Option` value.
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch (err) {
    // Same fail-soft posture as `loadSitemap` — a network blip
    // or cold-start race shouldn't tear down the editor. The
    // editor's `<TagSuggestionsProvider tags={[]}>` then renders
    // the free-text fallback, which is identical to the host
    // not having opted in at all.
    console.warn(
      '[Mosaic][Middleware] Failed to load tag suggestions; falling back to empty list.',
      err instanceof Error ? err.message : err
    );
    return [];
  }
};

const loadTagSuggestionsCached = withCrossRequestCache(
  loadTagSuggestionsImpl,
  ['mosaic', 'tagSuggestions'],
  // Loader signature: `(mode, contentUrl)`. Mode is the first arg.
  ([mode]) => mode,
  tags => tags.length > 0
);

/**
 * Resolve the host's tag vocabulary — the names the in-browser
 * editor's `<TagSuggestionsProvider>` feeds into the
 * Frontmatter `tags` ComboBox for autocomplete.
 *
 * Active mode hits the CLI's admin endpoint `/_mosaic_/tags/list`
 * (which reads the `$TagPlugin`-populated `/.tags` directory of
 * the union FS). Snapshot mode returns `[]` — there's no
 * enumeration endpoint for the snapshot dir, and the editor's
 * ComboBox accepts free-text anyway, so the degraded experience
 * is "no dropdown suggestions" rather than "editor broken".
 *
 * Failures (network down, upstream 5xx, malformed JSON) fall
 * back to `[]` with a warning logged — see {@link loadSitemap}
 * for the same fail-soft posture and rationale.
 *
 * Cache wiring mirrors {@link getMdxRawSource}: per-request
 * `cache()` so a single render shares one fetch, plus
 * cross-request `unstable_cache` for non-empty lists (see
 * `withCrossRequestCache`).
 */
export const getTagSuggestions = cache(async (mode: MosaicMode, contentUrl: string) =>
  loadTagSuggestionsCached(mode, contentUrl)
);
