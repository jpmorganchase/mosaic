'use server';

/**
 * Loads the header/footer data for the 404 page.
 *
 * Next.js renders `app/not-found.tsx` as part of every page response,
 * not only when a page is missing, so anything it fetched on the server
 * ran on every request. Instead, `<NotFoundBody>` calls this action
 * from the browser, only when a 404 is actually on screen.
 *
 * Taking the requested pathname (rather than always the site root)
 * means the 404 shows the header of the section the reader was in.
 *
 * Server Actions are public endpoints. This one only returns data every
 * page already ships to the browser, and the pathname is validated
 * before it reaches the loaders.
 *
 * Static-export builds replace this module with a stub via
 * `scripts/static-export-route-stubs.mjs`; `not-found.tsx` loads the
 * data at build time there instead.
 */
import {
  getSearchData,
  getSharedConfig,
  resolveMosaicMode
} from '@jpmorganchase/mosaic-site-middleware';

import { isSafeRoute } from '../lib/routes';

export async function loadNotFoundChrome(pathname: unknown): Promise<Record<string, unknown>> {
  const route = isSafeRoute(pathname) ? pathname : '/';
  const { mode, contentUrl } = resolveMosaicMode();
  const [sharedConfig, search] = await Promise.all([
    getSharedConfig(route, mode, contentUrl).catch(() => undefined),
    getSearchData(mode, contentUrl).catch(() => ({
      searchIndex: undefined,
      searchConfig: undefined
    }))
  ]);
  return {
    sharedConfig,
    searchIndex: search.searchIndex,
    searchConfig: search.searchConfig
  };
}
