/**
 * Resolves a catch-all pathname to its MDX content and shared config.
 *
 * Kept out of `page.tsx` so the rules can be unit tested; both
 * `generateMetadata` and the page render call `resolveContent`, and the
 * `cache()` wrapper makes them share one resolution per request.
 */
import { cache } from 'react';
import type { MosaicMode } from '@jpmorganchase/mosaic-types';
import { getMdxRaw, getSharedConfig } from '@jpmorganchase/mosaic-site-middleware';

import { isSafeRoute } from '../../../lib/routes';

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
 * `originalPathname` is the URL the user requested (the `[...route]`
 * params); `pathname` is where the content lives after following any
 * folder→index hops. They differ when the user lands on `/dp/products`
 * and the file is `/dp/products/index`, which lets the editor save
 * against the file while the page renders under the requested URL.
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
      mdx: MdxContent;
      sharedConfig: SharedConfig;
    }
  | { kind: 'not-found'; originalPathname: string; pathname: string; sharedConfig: SharedConfig }
  | { kind: 'redirect'; destination: string };

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
      // MDX and shared config are independent per pathname, so fetch
      // them in parallel.
      const [mdx, sharedConfig] = await Promise.all([
        getMdxRaw(pathname, mode, contentUrl),
        getSharedConfig(pathname, mode, contentUrl)
      ]);

      if (mdx.kind === 'mdx') {
        return { kind: 'mdx', originalPathname, pathname, mdx, sharedConfig };
      }

      if (mdx.kind === 'not-found') {
        return { kind: 'not-found', originalPathname, pathname, sharedConfig };
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

/**
 * The route search engines should index for a page.
 *
 * Mosaic stamps every page's frontmatter with its canonical `route`
 * (for example `/mosaic/getting-started/index`), which already accounts
 * for folder URLs and aliases in every content mode. Falls back to
 * `fallback` when the frontmatter has no usable route.
 */
export function canonicalRoute(frontmatter: Record<string, unknown>, fallback: string): string {
  const { route } = frontmatter;
  return isSafeRoute(route) ? route : fallback;
}
