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
import { newPageWritable } from './newPageSources.js';
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
 * For misses, `sharedConfig` is the requested folder's config when available.
 * Use `getNewPageSharedConfig` to resolve creation eligibility and inherited
 * config for a new page.
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
  | {
      kind: 'not-found';
      originalPathname: string;
      pathname: string;
      sharedConfig: SharedConfig;
      redirectLimitReached?: true;
    }
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
 * The shared config of a folder itself. `getSharedConfig` takes a page
 * path and reads the config of the folder that page is in.
 */
const getFolderSharedConfig = (folder: string, mode: MosaicMode, contentUrl: string) =>
  getSharedConfig(path.posix.join(folder, 'index'), mode, contentUrl);

/**
 * The most folders `getNewPageSharedConfig` reads, from the new page's
 * folder upwards, looking for a config.
 *
 * Each folder is a separate, sequential read from the content server, and
 * the folder comes from the request, so a made-up path many folders deep
 * must not cost one read per folder. Content is rarely more than a handful
 * of folders deep; 32 leaves plenty of room. A folder with no config in
 * its nearest 32 levels, itself included, gets none.
 */
export const MAX_NEW_PAGE_CONFIG_LOOKUPS = 32;

/**
 * The config of `folder` or, when it has none, of the nearest folder
 * above it that does, reading at most `MAX_NEW_PAGE_CONFIG_LOOKUPS`
 * folders.
 *
 * This deliberately doesn't stop at the owning source's mount: a source
 * mounted below another, without an index of its own, shares the layout
 * config of the folder above it.
 */
async function getNearestFolderSharedConfig(
  folder: string,
  mode: MosaicMode,
  contentUrl: string
): Promise<SharedConfig> {
  let current = path.posix.normalize(folder);
  for (let lookups = 1; ; lookups++) {
    const config = await getFolderSharedConfig(current, mode, contentUrl);
    if (config !== undefined || current === '/' || lookups >= MAX_NEW_PAGE_CONFIG_LOOKUPS) {
      return config;
    }
    current = path.posix.dirname(current);
  }
}

export interface NewPageSharedConfigOptions {
  /**
   * Changes the config before it's checked for `sourceCapabilities.writable`,
   * and the config returned. Pass the function the page applies to its
   * shared config, such as the reference site's dev capability bypass, so
   * a folder it makes writable still gets its layout config.
   */
  transformSharedConfig?: (sharedConfig: SharedConfig) => SharedConfig;
  /**
   * Only `sourceCapabilities` is needed, as for `createNewPageHandler`:
   * don't look for layout config when the CLI's creation metadata says
   * whether the folder is writable. Older content servers without that
   * metadata are still searched, as their folders' configs are the answer.
   */
  capabilitiesOnly?: boolean;
}

/**
 * The shared config a new page in `folder` (`/docs/guides`, or `/` for
 * the root) is created under: the folder's own config or, when the folder
 * doesn't exist yet, the config of the nearest folder above it that does.
 *
 * Mosaic only writes shared config for folders that hold pages, so
 * without this a page in a new folder would have no config, and the
 * create flow would have no layout config. Creation capability instead comes
 * from the CLI's source prefixes and save workflows, independently of indexes.
 * Older snapshots without that metadata retain the shared-config fallback.
 *
 * A folder the metadata says new pages can't be created in answers
 * `{ sourceCapabilities: { writable: false } }` without reading any folder's
 * config. The search for config stops after `MAX_NEW_PAGE_CONFIG_LOOKUPS`
 * folders. Each read goes to the content server, so call this only for a
 * request that can create a page, such as one from a signed-in editor.
 *
 * Returns `undefined` when no folder searched has a config and there's no
 * creation metadata.
 */
export async function getNewPageSharedConfig(
  folder: string,
  mode: MosaicMode,
  contentUrl: string,
  options: NewPageSharedConfigOptions = {}
): Promise<SharedConfig> {
  const { transformSharedConfig = config => config, capabilitiesOnly = false } = options;
  if (!folder.startsWith('/')) return transformSharedConfig(undefined);
  const writable = await newPageWritable(folder, mode, contentUrl);
  if (writable === undefined) {
    return transformSharedConfig(await getNearestFolderSharedConfig(folder, mode, contentUrl));
  }
  const capabilities = transformSharedConfig({ sourceCapabilities: { writable } } as SharedConfig);
  if (capabilitiesOnly || capabilities?.sourceCapabilities?.writable !== true) return capabilities;
  return transformSharedConfig({
    ...(await getNearestFolderSharedConfig(folder, mode, contentUrl)),
    sourceCapabilities: { writable }
  } as SharedConfig);
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
        const sharedConfig = configResult.status === 'fulfilled' ? configResult.value : undefined;
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
    return {
      kind: 'not-found',
      originalPathname,
      pathname,
      sharedConfig: undefined,
      redirectLimitReached: true
    };
  }
);
