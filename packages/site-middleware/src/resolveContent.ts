/**
 * Resolves a catch-all pathname to its MDX content and shared config.
 *
 * Shared by App Router hosts. Both metadata and page rendering can call
 * this loader; the `cache()` wrapper shares one resolution per request.
 */
import { cache } from 'react';
import path from 'node:path';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import { getMdxRaw, getSharedConfig } from './cachedLoaders.js';
import { canonicalRoute, isSafeContentPath } from './canonicalRoute.js';
export { canonicalRoute } from './canonicalRoute.js';

type MdxContent = Extract<Awaited<ReturnType<typeof getMdxRaw>>, { kind: 'mdx' }>;
type SharedConfig = Awaited<ReturnType<typeof getSharedConfig>>;

/**
 * Max number of redirect hops we'll follow in-process before giving
 * up and treating the route as not found.
 *
 * A misconfigured upstream that points `/a` → `/a/index` → `/a`
 * would otherwise hang the request; three hops is generous for the
 * folder→index case (always one hop) while keeping the worst-case
 * latency bounded.
 */
export const MAX_INTERNAL_REDIRECT_HOPS = 3;

/**
 * `true` when `destination` is the folder→index canonicalisation of
 * `from` (`/a/b` → `/a/b/index`, with or without a trailing slash on
 * `from`). This is the **only** redirect class we follow server-side;
 * anything else is a real content move and deserves a true HTTP
 * redirect so the URL bar updates.
 */
export function isFolderIndexRedirect(from: string, destination: string): boolean {
  const stripped = from.replace(/\/+$/, '');
  return destination === `${stripped}/index`;
}

/**
 * One resolved view of the route.
 *
 * `originalPathname` is the requested URL. `pathname` is the document's
 * public canonical URL. `sourcePathname` is its backing file, including
 * the extension when Mosaic supplied `fullPath`. Config, raw-source and
 * save operations use that backing path; an authored public permalink
 * must not select another source's capabilities or become a save target.
 *
 * `sharedConfig` is final: the folder's config with the page's own
 * authored `sharedConfig` on top (see `mergePageSharedConfig`). The
 * frontmatter's `sharedConfig` is replaced with the same value, so
 * spreading the frontmatter can't bring authored capabilities back.
 *
 * `sharedConfig` is returned for misses too: it belongs to the folder
 * the missing page would live in, which is what the create-page flow
 * (`?new=1`) checks for `sourceCapabilities.writable`.
 */
export type ResolvedContent =
  | {
      kind: 'mdx';
      originalPathname: string;
      pathname: string;
      sourcePathname: string;
      mdx: MdxContent;
      sharedConfig: SharedConfig;
    }
  | { kind: 'not-found'; originalPathname: string; pathname: string; sharedConfig: SharedConfig }
  | { kind: 'redirect'; destination: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The shared config a page renders with: its folder's config, with the
 * page's own authored `sharedConfig` (a per-page header or footer, for
 * example) on top.
 *
 * `sourceCapabilities` only ever comes from the folder's config, which
 * Mosaic derives from the page's source. Content can't grant itself
 * capabilities, such as turning on the editor, by authoring them.
 */
export function mergePageSharedConfig(folderConfig: SharedConfig, authored: unknown): SharedConfig {
  if (!isRecord(authored)) return folderConfig;
  const { sourceCapabilities: _authoredCapabilities, ...overrides } = authored;
  return { ...(folderConfig ?? {}), ...overrides } as SharedConfig;
}

/**
 * Fetch MDX + shared config for a pathname, transparently following
 * folder→index redirects up to `MAX_INTERNAL_REDIRECT_HOPS` hops.
 *
 * **Why follow redirects here.** In active mode the content server
 * answers folder pathnames (`/dp/products`) with HTTP 302 pointing at
 * the file (`/dp/products/index`). Forwarding that to `redirect()`
 * makes the App Router issue a second request, and the page subtree
 * unmounts when the URL changes, before the destination's payload
 * arrives: a ~150 ms blank-chrome flash on every nav to a folder URL.
 * Following the redirect inside the same render keeps the navigation a
 * single client commit. The page then fixes the URL bar with
 * `<CanonicalizeUrl>` and points search engines at the file with
 * `alternates.canonical`.
 *
 * The inner loaders are request-cached and, in snapshot modes,
 * cross-request cached, so a followed redirect costs at most one extra
 * fetch per hop.
 */
export const resolveContent = cache(
  async (
    originalPathname: string,
    mode: MosaicMode,
    contentUrl: string
  ): Promise<ResolvedContent> => {
    let pathname = originalPathname;

    for (let hop = 0; hop <= MAX_INTERNAL_REDIRECT_HOPS; hop++) {
      // Start the ordinary same-folder reads together. An alias may
      // ultimately use another folder's config, so a failure in this
      // provisional lookup must not hide a valid target document.
      const [mdxResult, configResult] = await Promise.allSettled([
        getMdxRaw(pathname, mode, contentUrl),
        getSharedConfig(pathname, mode, contentUrl)
      ]);
      if (mdxResult.status === 'rejected') throw mdxResult.reason;
      const mdx = mdxResult.value;
      const requestedConfig = () => {
        if (configResult.status === 'rejected') throw configResult.reason;
        return configResult.value;
      };

      if (mdx.kind === 'mdx') {
        // Sources stamp fullPath from the backing document. An alias can
        // live in an unrelated folder, whose shared config (if any) does
        // not describe this document. Keep route/permalink metadata out
        // of the configuration and write-provenance decision.
        const sourcePathname = isSafeContentPath(mdx.frontmatter.fullPath)
          ? mdx.frontmatter.fullPath
          : pathname;
        const documentConfig =
          path.posix.dirname(sourcePathname) === path.posix.dirname(pathname)
            ? requestedConfig()
            : await getSharedConfig(sourcePathname, mode, contentUrl);
        const sharedConfig = mergePageSharedConfig(documentConfig, mdx.frontmatter.sharedConfig);
        return {
          kind: 'mdx',
          originalPathname,
          pathname: canonicalRoute(mdx.frontmatter, pathname),
          sourcePathname,
          // The loaders' results are cached, so copy rather than change them.
          mdx:
            'sharedConfig' in mdx.frontmatter
              ? { ...mdx, frontmatter: { ...mdx.frontmatter, sharedConfig } }
              : mdx,
          sharedConfig
        };
      }

      if (mdx.kind === 'not-found') {
        return { kind: 'not-found', originalPathname, pathname, sharedConfig: requestedConfig() };
      }

      // A redirect that isn't the folder→index canonicalisation is a
      // real content move: surface it so the caller can `redirect()`.
      if (!isFolderIndexRedirect(pathname, mdx.destination)) {
        return { kind: 'redirect', destination: mdx.destination };
      }
      pathname = mdx.destination;
    }

    // Hop budget exhausted. Treat as not-found (with no shared config,
    // so nothing can be created here) rather than looping or failing
    // with a misleading 500.
    console.error(
      `[mosaic-site] redirect chain exceeded ${MAX_INTERNAL_REDIRECT_HOPS} hops starting at ${originalPathname}; treating as not-found`
    );
    return { kind: 'not-found', originalPathname, pathname, sharedConfig: undefined };
  }
);
