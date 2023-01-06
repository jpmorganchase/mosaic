import path from 'path';
import fs from 'fs';
import { GetServerSidePropsContext } from 'next';
import type { SearchIndex, SearchIndexSlice } from '@jpmorganchase/mosaic-store';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

export { SearchIndex };

/**
 * Fetch search-data.json
 *
 * @param url the search data file URL
 * @returns search data JSON
 */
async function fetchSearchData(url: string) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response;
}

/**
 * Read the search data from the file system
 *
 * @param url the search data file URL
 * @returns search data JSON
 */
async function readSearchData(url: string) {
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  const filePath = path.posix.join(process.cwd(), mosaicSnapshotDir, url);
  try {
    const realPath = await fs.promises.realpath(filePath);
    const data = await fs.promises.readFile(realPath, 'utf-8');
    return new Response(data.toString(), { status: 200 });
  } catch (e) {
    // it doesn't matter if no search data file was found
    return new Response('', { status: 204 });
  }
}

/**
 * Adds the [[`SearchIndex`]] props to the page props
 * @param _context
 * @param _params
 */
export const withSearchIndex: MosaicMiddleware<SearchIndexSlice> = async (
  context: GetServerSidePropsContext
) => {
  const { res } = context;
  const isStatic = res.getHeader('X-Mosaic-Mode') === 'static';
  const mosaicUrl = isStatic ? '' : res.getHeader('X-Mosaic-Content-Url');
  const searchDataUrl = `${mosaicUrl}/search-data.json`;
  let response;
  try {
    response = isStatic
      ? await readSearchData(searchDataUrl)
      : await fetchSearchData(searchDataUrl);

    if (response.ok && response.status !== 204) {
      const searchIndexData = await response.json();

      return { props: { searchIndex: searchIndexData } };
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new MiddlewareError(500, searchDataUrl, [error.message], { show500: true });
    } else {
      console.error('unexpected error');
      throw new MiddlewareError(500, searchDataUrl, ['unexpected error'], { show500: true });
    }
  }
  const show500 = response.status !== 404 && response.status !== 204;
  const show404 = response.status === 404;
  let errorMessage = `Could not find any search data defined for ${searchDataUrl}`;
  if (show500) {
    errorMessage = `An un-expected error occurred reading ${searchDataUrl}`;
  }
  throw new MiddlewareError(response.status, searchDataUrl, [errorMessage], {
    show404,
    show500
  });
};
