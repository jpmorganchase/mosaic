import path from 'path';
import fs from 'fs';
import { GetServerSidePropsContext } from 'next';
import type { SharedConfig, SharedConfigSlice } from '@jpmorganchase/mosaic-store';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

export { SharedConfig };

/**
 * Fetch from mosaic the shared-config.json.
 *
 * @param url the shared config file URL
 * @returns shared config JSON
 */
async function fetchSharedConfig(url: string) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response;
}

/**
 * Read from the file system the shared config
 *
 * @param url the shared config file URL
 * @returns shared config JSON
 */
async function readSharedConfig(url: string) {
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  const filePath = path.posix.join(process.cwd(), mosaicSnapshotDir, url);
  try {
    const realPath = await fs.promises.realpath(filePath);
    const data = await fs.promises.readFile(realPath, 'utf-8');
    return new Response(data.toString(), { status: 200 });
  } catch (e) {
    // it doesn't matter if no shared config file was found
    return new Response('', { status: 204 });
  }
}

/**
 * Adds the [[`SharedConfig`]] props to the page props
 * @param _context
 * @param _params
 */
export const withSharedConfig: MosaicMiddleware<SharedConfigSlice> = async (
  context: GetServerSidePropsContext
) => {
  const { resolvedUrl, res } = context;
  const isStatic = res.getHeader('X-Mosaic-Mode') === 'static';
  const matches = resolvedUrl.match(/(.*)[!/]/);
  const urlPath = matches?.length ? matches[1] : '';
  const mosaicUrl = isStatic ? '' : res.getHeader('X-Mosaic-Content-Url');
  const sharedConfigUrl = `${mosaicUrl}${urlPath}/shared-config.json`;
  let response;
  try {
    response = isStatic
      ? await readSharedConfig(sharedConfigUrl)
      : await fetchSharedConfig(sharedConfigUrl);

    if (response.ok && response.status !== 204) {
      const { config } = (await response.json()) as { config: SharedConfig };

      return { props: { sharedConfig: config } };
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new MiddlewareError(500, sharedConfigUrl, [error.message], { show500: true });
    } else {
      console.error('unexpected error');
      throw new MiddlewareError(500, sharedConfigUrl, ['unexpected error'], { show500: true });
    }
  }
  const show500 = response.status !== 404 && response.status !== 204;
  const show404 = response.status === 404;
  let errorMessage = `Could not find any shared config defined for ${sharedConfigUrl}`;
  if (show500) {
    errorMessage = `An un-expected error occurred reading ${sharedConfigUrl}`;
  }
  throw new MiddlewareError(response.status, sharedConfigUrl, [errorMessage], {
    show404,
    show500
  });
};
