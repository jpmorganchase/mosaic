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
import type { SharedConfig } from '@jpmorganchase/mosaic-store';

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
 * Helper that conditionally wraps an impl in `unstable_cache`. We
 * could pass `revalidate: 0` to disable but `unstable_cache` still
 * wraps the call and complicates stack traces; bypassing entirely is
 * cleaner for the dev case.
 */
function withCrossRequestCache<TArgs extends unknown[], TResult>(
  impl: (...args: TArgs) => Promise<TResult>,
  keyParts: string[]
): (...args: TArgs) => Promise<TResult> {
  if (cacheDisabled) return impl;
  return unstable_cache(impl, keyParts, {
    tags: [MOSAIC_CONTENT_CACHE_TAG]
    // No `revalidate` — cache entries are valid until explicitly
    // invalidated via the tag. In active mode this is wrong (upstream
    // content changes); see `getMdxRaw`'s active-mode branch for the
    // workaround.
  });
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
  pathname: string,
  mode: MosaicMode,
  contentUrl: string
): Promise<SharedConfig | undefined> => {
  const urlPath = deriveSharedConfigUrlPath(pathname);

  if (mode === 'snapshot-file') {
    const { snapshotDir } = getSnapshotFileConfig(urlPath);
    const filePath = path.join(process.cwd(), snapshotDir, urlPath, 'shared-config.json');
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
    const s3Key = `${urlPath}/shared-config.json`.replace(/^\//, '');
    const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(s3Key);
    const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
    if (!(await keyExists(bucket, s3Key))) return undefined;
    const raw = await loadKey(bucket, s3Key);
    const parsed = safeJsonParse<{ config: SharedConfig }>(raw, `s3://${bucket}/${s3Key}`);
    return parsed?.config;
  }

  // Active mode — HTTP fetch from the running mosaic server.
  // Tagged so `revalidateTag` flushes it; `unstable_cache`'s caller
  // controls the upstream lifetime in active mode.
  const response = await fetch(`${contentUrl}${urlPath}/shared-config.json`, {
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

const loadSharedConfigCached = withCrossRequestCache(loadSharedConfigImpl, [
  'mosaic',
  'sharedConfig'
]);

/**
 * Resolve the per-route shared config (header, footer, search namespace,
 * etc.). Cached at the subtree level (e.g. `/mosaic/getting-started`)
 * so neighbour pages share the lookup.
 */
export const getSharedConfig = cache(
  async (pathname: string, mode: MosaicMode, contentUrl: string) =>
    loadSharedConfigCached(pathname, mode, contentUrl)
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
  const response = await fetch(`${contentUrl}/${targetPath}`, {
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
const loadSearchDataCached = withCrossRequestCache(loadSearchDataImpl, ['mosaic', 'searchData']);

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
    const { snapshotDir } = getSnapshotFileConfig(normalized);
    const filePath = path.posix.join(process.cwd(), snapshotDir, normalized);
    try {
      const raw = await loadLocalFile(filePath);
      return { kind: 'mdx', raw, frontmatter: parseFrontmatter(raw) };
    } catch {
      return { kind: 'not-found' };
    }
  }

  if (mode === 'snapshot-s3') {
    try {
      const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(normalized);
      const { loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
      const s3Key = normalized.replace(/^\//, '');
      const raw = await loadKey(bucket, s3Key);
      return { kind: 'mdx', raw, frontmatter: parseFrontmatter(raw) };
    } catch {
      return { kind: 'not-found' };
    }
  }

  // Active mode.
  const response = await fetch(`${contentUrl}${normalized}`);
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

const loadMdxRawCached = withCrossRequestCache(loadMdxRawImpl, ['mosaic', 'mdx']);

/**
 * Resolve the raw MDX text for a route. Returns one of three
 * discriminated outcomes so the caller can dispatch to `redirect()` /
 * `notFound()` / render without needing to inspect HTTP status codes.
 *
 * Caching note: caching the raw text in active mode is technically
 * incorrect (the upstream may change) but for any reasonable Mosaic
 * deployment the upstream IS itself a Mosaic CLI process that emits a
 * snapshot — and a snapshot rebuild is exactly the kind of event that
 * should trigger `revalidateTag(MOSAIC_CONTENT_CACHE_TAG)`. So the
 * cache lifetime is bounded by the same external signal in either
 * mode.
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

  const normalized = normalizeMdxUrl(pathname);
  const response = await fetch(`${contentUrl}${RAW_ROUTE_PREFIX}${normalized}`);

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

const loadMdxRawSourceCached = withCrossRequestCache(loadMdxRawSourceImpl, ['mosaic', 'mdxRaw']);

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
