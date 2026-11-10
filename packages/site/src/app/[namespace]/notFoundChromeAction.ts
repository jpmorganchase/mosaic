'use server';

import { getSharedConfig, resolveMosaicMode } from '@jpmorganchase/mosaic-site-middleware';

import { isSafeRoute } from '../../lib/routes';

/** Loads the public section config for a missing document. */
export async function loadNotFoundSharedConfig(pathname: unknown) {
  if (!isSafeRoute(pathname)) return undefined;
  const { mode, contentUrl } = resolveMosaicMode();
  return getSharedConfig(pathname, mode, contentUrl);
}
