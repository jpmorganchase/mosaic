import type { LlmsManifest, MosaicMode } from '@jpmorganchase/mosaic-types';
import { createContentFileCache } from './contentFiles.js';
import { resolveMosaicMode } from './loadSitemap.js';

export const LLMS_MANIFEST_FILE = 'llms-manifest.json';

/** Canonical page routes may be authored with a trailing slash. Preserve `/`. */
export const normalizeLlmsRoute = (route: string) =>
  route === '/' ? route : route.replace(/\/+$/, '');

/** Never choose one page when older generated data has colliding route keys. */
export function unambiguousLlmsRoutes(routes: string[]) {
  const normalized = routes.map(normalizeLlmsRoute);
  const counts = new Map<string, number>();
  for (const route of normalized) {
    const key = route.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return normalized.filter(route => counts.get(route.toLowerCase()) === 1);
}

/** Validate before using a route in a file path or HTTP Link header. */
export function isLlmsRoute(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.length > 4096) return false;
  if (value === '/') return true;
  try {
    return value
      .slice(1)
      .split('/')
      .every(segment => {
        let decoded: string;
        try {
          decoded = decodeURIComponent(segment);
        } catch {
          decoded = segment;
        }
        // eslint-disable-next-line no-control-regex
        const unsafe = /[/\\\x00-\x1f\x7f]/.test(decoded);
        return !!decoded && decoded !== '.' && decoded !== '..' && !unsafe;
      });
  } catch {
    return false;
  }
}

/** An origin, with an optional path, that is safe in HTML and Link headers. */
const isSiteUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\/[^\s<>"?#]+$/.test(value);

let warnedSiteUrl: string | undefined;

export function parseLlmsManifest(text: string): LlmsManifest {
  const manifest = JSON.parse(text) as LlmsManifest;
  if (
    manifest?.version !== 1 ||
    !Array.isArray(manifest.routes) ||
    !manifest.routes.every(
      route => typeof route === 'string' && isLlmsRoute(normalizeLlmsRoute(route))
    ) ||
    !Array.isArray(manifest.scopes) ||
    !manifest.scopes.every(
      scope =>
        isLlmsRoute(scope) &&
        scope === scope.toLowerCase() &&
        /^\/[a-z0-9_~-][a-z0-9._~-]*(?:\/[a-z0-9_~-][a-z0-9._~-]*)*$/.test(scope)
    ) ||
    new Set(manifest.scopes).size !== manifest.scopes.length
  )
    throw new Error(`Unsupported ${LLMS_MANIFEST_FILE} format`);
  const { siteUrl, ...rest } = manifest;
  // Links are root-relative without siteUrl, so one bad value must not make
  // every page's Markdown unavailable.
  if (siteUrl !== undefined && !isSiteUrl(siteUrl)) {
    const value = JSON.stringify(siteUrl)?.slice(0, 200);
    if (warnedSiteUrl !== value) {
      warnedSiteUrl = value;
      console.warn(
        `[Mosaic] Ignoring invalid siteUrl ${value} in ${LLMS_MANIFEST_FILE}; LLM links are root-relative`
      );
    }
  }
  return {
    ...rest,
    ...(isSiteUrl(siteUrl) && { siteUrl }),
    routes: unambiguousLlmsRoutes(manifest.routes)
  };
}

export function createLlmsManifestLoader(maxAge = 30_000) {
  return createContentFileCache(LLMS_MANIFEST_FILE, parseLlmsManifest, {
    maxAge,
    staleWhileRevalidate: false
  });
}

export interface LlmsDiscovery {
  markdownUrl: string;
  indexUrl: string;
}

/** The canonical page selects its index; an alias's location never changes it. */
export function llmsDiscoveryForRoute(route: string, manifest?: LlmsManifest): LlmsDiscovery {
  route = normalizeLlmsRoute(route);
  const scope = (manifest?.scopes ?? []).reduce(
    (best, candidate) =>
      candidate.length > best.length &&
      (route.toLowerCase() === candidate || route.toLowerCase().startsWith(`${candidate}/`))
        ? candidate
        : best,
    ''
  );
  const origin = (manifest?.siteUrl ?? '').replace(/\/+$/, '');
  // Route keys may contain spaces or Unicode. Encode URI components for HTML
  // and Link headers without changing the existing Markdown bundle's keys.
  const urlPath = route
    .split('/')
    .map(segment => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join('/');
  return { markdownUrl: `${origin}${urlPath}.md`, indexUrl: `${origin}${scope}/llms.txt` };
}

/** Only advertise Markdown that the plugin actually generated, including on aliases. */
export function createLlmsDiscoveryLoader(maxAge = 30_000) {
  const getManifest = createLlmsManifestLoader(maxAge);
  return async (
    route: string,
    mode: MosaicMode,
    contentUrl: string
  ): Promise<LlmsDiscovery | undefined> => {
    route = normalizeLlmsRoute(route);
    if (!isLlmsRoute(route)) return undefined;
    const manifest = await getManifest(mode, contentUrl);
    const canonical = manifest?.routes.find(
      candidate => candidate.toLowerCase() === route.toLowerCase()
    );
    return canonical ? llmsDiscoveryForRoute(canonical, manifest) : undefined;
  };
}

const loadDiscovery = createLlmsDiscoveryLoader();

/** Server-only HTML discovery, independent of the full Markdown corpus. */
export async function getLlmsDiscovery(route: string): Promise<LlmsDiscovery | undefined> {
  const { mode, contentUrl } = resolveMosaicMode();
  try {
    return await loadDiscovery(route, mode, contentUrl);
  } catch (error) {
    // Optional discovery must not prevent the HTML document from rendering.
    console.warn(`[Mosaic] Couldn't load LLM discovery: ${error}`);
    return undefined;
  }
}
