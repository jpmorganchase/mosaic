import { GetServerSidePropsContext } from 'next';
import type { SharedConfig, SharedConfigSlice } from '@jpmorganchase/mosaic-store';
import { MosaicMiddleware } from './createMiddlewareRunner';
import MiddlewareError from './MiddlewareError';

export { SharedConfig };

/**
 * Adds the [[`SharedConfig`]] props to the page props
 * @param _context
 * @param _params
 */
export const withSharedConfig: MosaicMiddleware<SharedConfigSlice> = async (
  _context: GetServerSidePropsContext,
  _params
) => {
  const matches = _context.resolvedUrl.match(/(.*)[!/]/);
  const urlPath = matches?.length ? matches[1] : '';
  // Use env: MOSAIC_URL="http://localhost:3000/api/snapshots" to point to static data api
  const mosaicUrl = process.env.MOSAIC_URL || 'http://localhost:8080';
  const sharedConfigUrl = `${mosaicUrl}${urlPath}/shared-config.json`;
  let response;
  try {
    response = await fetch(sharedConfigUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
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
  const show404 = response.status === 404 || response.status === 204;
  let errorMessage = `Could not find any shared config defined for ${sharedConfigUrl}`;
  if (show500) {
    errorMessage = `An un-expected error occurred reading ${sharedConfigUrl}`;
  }
  throw new MiddlewareError(response.status, sharedConfigUrl, [errorMessage], {
    show404,
    show500
  });
};
