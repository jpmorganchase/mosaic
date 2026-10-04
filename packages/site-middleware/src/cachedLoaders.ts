/**
 * App-Router-native cached loaders for Mosaic content.
 *
 * Three pure, independently cacheable primitives that the page calls in
 * parallel via `Promise.all`, which:
 *
 *   - eliminates redundant work (e.g. the search-data files are
 *     identical for every page in the site but were previously re-read
 *     on every request),
 *   - turns the request shape from `sum(stepLatencies)` into
 *     `max(stepLatencies)` because the three loaders have no real
 *     dependency on each other,
 *   - exposes a tag-based revalidation hook (`revalidateTag('mosaic-content')`)
 *     so an external trigger (typically the Mosaic CLI hitting
 *     `POST /api/revalidate` after rebuilding a snapshot) can mark
 *     every cache entry stale without restarting the server.
 *
 * Each loader is wrapped in two cache layers:
 *
 *   1. {@link cache} from `react` — *request-scoped* memoisation. If
 *      `generateMetadata` and the page render both call the same loader
 *      with the same args, the underlying work runs once per request.
 *
 *   2. {@link unstable_cache} from `next/cache` — *cross-request*
 *      memoisation with revalidation. Backed by Next's data cache; in
 *      dev it lives in-memory, in prod it's the deployment's data
 *      cache layer (filesystem in self-hosted, edge KV on Vercel,
 *      etc.).
 *
 * Both layers are required: `unstable_cache` is global but its key is
 * a string — feeding it large argument structures defeats the win;
 * `cache()` is identity-keyed and per-request, so it deduplicates
 * within a render even before we hit `unstable_cache`.
 *
 * Server-only. Importing this from a client component throws.
 */
import fs from 'fs';
import path from 'path';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import matter from 'gray-matter';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import type { SharedConfig, SidebarItem } from '@jpmorganchase/mosaic-store';

import {
  createS3Loader,
  getSnapshotFileConfig,
  getSnapshotS3Config,
  loadLocalFile
} from './loaders/index.js';
import { MOSAIC_CONTENT_CACHE_TAG } from './cacheTags.js';

if (typeof window !== 'undefined') {
  throw new Error('cachedLoaders.ts must not be imported on the client.');
}

/**
 * Re-export so existing callers can continue to import this constant
 * from `cachedLoaders`. New callers (notably the `/api/revalidate`
 * route handler) should import from `./cacheTags.js` directly so
 * Next.js' NFT trace doesn't pull in this file's fs/S3 dependencies.
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
 * Snapshot modes (`snapshot-file`, `snapshot-s3`) always cache: their
 * bytes are stable until the next snapshot is published.
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
  isCacheable: (result: TResult) => boolean
): (...args: TArgs) => Promise<TResult> {
  if (cacheDisabled) return impl;
  const cached = unstable_cache(
    async (...args: TArgs) => {
      const result = await impl(...args);
      if (!isCacheable(result)) throw new UncachedResult(result);
      return result;
    },
    keyParts,
    { tags: [MOSAIC_CONTENT_CACHE_TAG] }
  );
  return async (...args: TArgs) => {
    if (bypassesCrossRequestCache(getMode(args))) return impl(...args);
    try {
      return await cached(...args);
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
 * snapshot files and S3 keys use the decoded name (`docs/a b`).
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
    const { snapshotDir } = getSnapshotFileConfig(snapshotPath);
    const filePath = path.join(process.cwd(), snapshotDir, snapshotPath, 'shared-config.json');
    try {
      await fs.promises.stat(filePath);
    } catch {
      return undefined;
    }
    const raw = await loadLocalFile(filePath);
    const parsed = safeJsonParse<{ config: SharedConfig }>(raw, filePath);
    return parsed?.config;
  }

  if (mode === 'snapshot-s3') {
    const snapshotPath = decodeSnapshotPath(urlPath);
    if (snapshotPath === undefined) return undefined;
    const s3Key = `${snapshotPath}/shared-config.json`.replace(/^\//, '');
    const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(s3Key);
    const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
    if (!(await keyExists(bucket, s3Key))) return undefined;
    const raw = await loadKey(bucket, s3Key);
    const parsed = safeJsonParse<{ config: SharedConfig }>(raw, `s3://${bucket}/${s3Key}`);
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
  config => config !== undefined
);

/**
 * Resolve the per-route shared config (header, footer, search namespace,
 * etc.). Cached at the subtree level (e.g. `/mosaic/getting-started`)
 * so neighbour pages share the lookup, and requests for made-up pages
 * don't each add a cache entry.
 */
export const getSharedConfig = cache(
  async (pathname: string, mode: MosaicMode, contentUrl: string) =>
    loadSharedConfigCached(deriveSharedConfigUrlPath(pathname), mode, contentUrl)
);

// ---------------------------------------------------------------------------
// Sidebar loader
// ---------------------------------------------------------------------------

/**
 * `SidebarPlugin` writes one `sidebar.json` (`{ pages: [...] }`) per sidebar
 * root folder and points every page under that folder at it, so each page's
 * `sidebarData` frontmatter is a copy of the same tree. Loading the file
 * once per folder lets a host send the tree once rather than with every
 * page.
 */
function readSidebarPages(raw: string, source: string): SidebarItem[] | undefined {
  const parsed = safeJsonParse<{ pages?: SidebarItem[] }>(raw, source);
  return Array.isArray(parsed?.pages) ? parsed.pages : undefined;
}

const loadSidebarImpl = async (
  folder: string,
  mode: MosaicMode,
  contentUrl: string
): Promise<SidebarItem[] | undefined> => {
  const folderPath = folder.replace(/\/+$/, '');

  if (mode === 'snapshot-file') {
    const snapshotPath = decodeSnapshotPath(folderPath);
    if (snapshotPath === undefined) return undefined;
    const { snapshotDir } = getSnapshotFileConfig(snapshotPath);
    const filePath = path.join(process.cwd(), snapshotDir, snapshotPath, 'sidebar.json');
    try {
      await fs.promises.stat(filePath);
    } catch {
      return undefined;
    }
    return readSidebarPages(await loadLocalFile(filePath), filePath);
  }

  if (mode === 'snapshot-s3') {
    const snapshotPath = decodeSnapshotPath(folderPath);
    if (snapshotPath === undefined) return undefined;
    const s3Key = `${snapshotPath}/sidebar.json`.replace(/^\//, '');
    const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(s3Key);
    const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
    if (!(await keyExists(bucket, s3Key))) return undefined;
    return readSidebarPages(await loadKey(bucket, s3Key), `s3://${bucket}/${s3Key}`);
  }

  // Active mode. `cache: 'no-store'` — see `loadSharedConfigImpl`.
  const response = await fetch(`${contentUrl}${folderPath}/sidebar.json`, { cache: 'no-store' });
  if (response.ok) {
    return readSidebarPages(await response.text(), `${contentUrl}${folderPath}/sidebar.json`);
  }
  if (response.status === 404) return undefined;
  throw new Error(
    `Failed to load sidebar from ${contentUrl}${folderPath}: ${response.status} ${response.statusText}`
  );
};

const loadSidebarCached = withCrossRequestCache(
  loadSidebarImpl,
  ['mosaic', 'sidebar'],
  // Loader signature: `(folder, mode, contentUrl)`. Mode is the second arg.
  ([, mode]) => mode,
  pages => pages !== undefined
);

/**
 * Resolve the sidebar tree `SidebarPlugin` published for a folder (for
 * example `/mosaic/configure`), or `undefined` when the folder isn't a
 * sidebar root.
 */
export const getSidebarData = cache(async (folder: string, mode: MosaicMode, contentUrl: string) =>
  loadSidebarCached(folder, mode, contentUrl)
);

// ---------------------------------------------------------------------------
// Search index loader
// ---------------------------------------------------------------------------

const SEARCH_DATA_FILE = 'search-data-condensed.json';
const SEARCH_CONFIG_FILE = 'search-config.json';

async function readSnapshotJsonFile(targetFile: string): Promise<unknown | undefined> {
  // Search files live at the snapshot root, not per-route, so the
  // `urlPath` arg to `getSnapshotFileConfig` is only used to pick the
  // active snapshot dir. Pass empty.
  const { snapshotDir } = getSnapshotFileConfig('');
  const filePath = path.join(process.cwd(), snapshotDir, targetFile);
  try {
    await fs.promises.stat(filePath);
  } catch {
    return undefined;
  }
  const raw = await loadLocalFile(filePath);
  return safeJsonParse(raw, filePath);
}

async function readSnapshotS3Json(targetKey: string): Promise<unknown | undefined> {
  const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(targetKey);
  const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
  if (!(await keyExists(bucket, targetKey))) return undefined;
  const raw = await loadKey(bucket, targetKey);
  return safeJsonParse(raw, `s3://${bucket}/${targetKey}`);
}

async function fetchUpstreamJson(
  contentUrl: string,
  targetPath: string
): Promise<unknown | undefined> {
  // `cache: 'no-store'` — see the equivalent comment in
  // `loadSharedConfigImpl`'s active-mode branch. Without
  // `MOSAIC_ACTIVE_MODE_CACHE` this runs on every request (the
  // per-request `cache()` only shares it within one render).
  const response = await fetch(`${contentUrl}/${targetPath}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }
  });
  if (response.ok) return response.json();
  if (response.status === 404) return undefined;
  throw new Error(
    `Failed to load ${targetPath} from ${contentUrl}: ${response.status} ${response.statusText}`
  );
}

const loadSearchDataImpl = async (
  mode: MosaicMode,
  contentUrl: string
): Promise<{ searchIndex?: unknown; searchConfig?: unknown }> => {
  if (mode === 'snapshot-file') {
    const [searchIndex, searchConfig] = await Promise.all([
      readSnapshotJsonFile(SEARCH_DATA_FILE),
      readSnapshotJsonFile(SEARCH_CONFIG_FILE)
    ]);
    return { searchIndex, searchConfig };
  }
  if (mode === 'snapshot-s3') {
    const [searchIndex, searchConfig] = await Promise.all([
      readSnapshotS3Json(SEARCH_DATA_FILE),
      readSnapshotS3Json(SEARCH_CONFIG_FILE)
    ]);
    return { searchIndex, searchConfig };
  }
  const [searchIndex, searchConfig] = await Promise.all([
    fetchUpstreamJson(contentUrl, SEARCH_DATA_FILE),
    fetchUpstreamJson(contentUrl, SEARCH_CONFIG_FILE)
  ]);
  return { searchIndex, searchConfig };
};

// Key includes only `mode` — the search files are the same for every
// route in a given mode + contentUrl combination.
const loadSearchDataCached = withCrossRequestCache(
  loadSearchDataImpl,
  ['mosaic', 'searchData'],
  // Loader signature: `(mode, contentUrl)`. Mode is the first arg.
  ([mode]) => mode,
  data => data.searchIndex !== undefined
);

/**
 * Resolve the (site-wide) search index + config. Identical for every
 * page in a deployment, so this cache key is keyed on the mode
 * (snapshot-file / snapshot-s3 / active) rather than per-route; once
 * loaded it's reused across all subsequent page renders until
 * `revalidateTag(MOSAIC_CONTENT_CACHE_TAG)` invalidates.
 */
export const getSearchData = cache(async (mode: MosaicMode, contentUrl: string) =>
  loadSearchDataCached(mode, contentUrl)
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
 * Parse only the YAML frontmatter from raw MDX. `gray-matter` is
 * regex+YAML — much cheaper than running the full MDX compiler just to
 * read the header block.
 */
function parseFrontmatter(raw: string): Record<string, unknown> {
  try {
    const { data } = matter(raw);
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
    const { snapshotDir } = getSnapshotFileConfig(snapshotPath);
    const filePath = path.posix.join(process.cwd(), snapshotDir, snapshotPath);
    try {
      const raw = await loadLocalFile(filePath);
      return { kind: 'mdx', raw, frontmatter: parseFrontmatter(raw) };
    } catch {
      return { kind: 'not-found' };
    }
  }

  if (mode === 'snapshot-s3') {
    const snapshotPath = decodeSnapshotPath(normalized);
    if (snapshotPath === undefined) return { kind: 'not-found' };
    try {
      const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(snapshotPath);
      const { loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
      const s3Key = snapshotPath.replace(/^\//, '');
      const raw = await loadKey(bucket, s3Key);
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
  result => result.kind !== 'not-found'
);

/**
 * Resolve the raw MDX text for a route. Returns one of three
 * discriminated outcomes so the caller can dispatch to `redirect()` /
 * `notFound()` / render without needing to inspect HTTP status codes.
 *
 * Caching note: snapshot modes cache the raw text cross-request
 * (the bytes are immutable until the next snapshot rebuild, which
 * expires them via `revalidateTag(MOSAIC_CONTENT_CACHE_TAG)`). Active
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
  | { kind: 'raw'; bytes: string; namespace: string | undefined }
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
  // Snapshot modes serve the post-plugin VFS — there's no
  // "raw source" concept on the snapshot side. Returning a
  // distinct status (rather than falling through to a 404)
  // lets the editor render a clear "raw source unavailable in
  // snapshot mode" hint instead of guessing.
  if (mode === 'snapshot-file' || mode === 'snapshot-s3') {
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
    const bytes = await response.text();
    const namespace = response.headers.get('x-mosaic-raw-namespace') ?? undefined;
    return { kind: 'raw', bytes, namespace };
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

const loadMdxRawSourceCached = withCrossRequestCache(
  loadMdxRawSourceImpl,
  ['mosaic', 'mdxRaw'],
  // Loader signature: `(pathname, mode, contentUrl)`. Mode is the
  // second arg.
  ([, mode]) => mode,
  result => result.kind !== 'not-found'
);

/**
 * Resolve the **raw on-disk source** for a route, bypassing the
 * Mosaic plugin pipeline. See {@link MdxRawSourceResult} for the
 * outcome shape.
 *
 * Cache wiring mirrors {@link getMdxRaw}: per-request `cache()`
 * + cross-request `unstable_cache` tagged with
 * `MOSAIC_CONTENT_CACHE_TAG`. The editor only fetches this on
 * its initial mount per page, so cache pressure is low.
 *
 * Note: snapshot deployments return `unavailable-in-mode` —
 * snapshots hold post-plugin VFS bytes, not raw source. The
 * editor branch is only reachable on dynamic (active) builds
 * with a signed-in user, so this is the expected combination
 * in practice.
 */
export const getMdxRawSource = cache(
  async (pathname: string, mode: MosaicMode, contentUrl: string) =>
    loadMdxRawSourceCached(pathname, mode, contentUrl)
);

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
  // Snapshot modes don't ship a `/.tags` enumeration endpoint —
  // the snapshot dir holds the post-plugin VFS bytes but no
  // sidecar listing. Returning `[]` (rather than throwing or a
  // distinct status) lets the host wire `<TagSuggestionsProvider>`
  // unconditionally: in snapshot mode authors get a free-text
  // ComboBox with an empty dropdown, in active mode they get
  // typeahead — same affordance, graceful degradation.
  if (mode === 'snapshot-file' || mode === 'snapshot-s3') {
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
 * the union FS). Snapshot modes return `[]` — there's no
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
