import path from 'path';
import { GetServerSidePropsContext } from 'next';
import type { SearchIndex, SearchIndexSlice } from '@jpmorganchase/mosaic-store';
import { fileLoaderProcessEnvSchema } from '@jpmorganchase/mosaic-schemas';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import { loadLocalFile, loadS3File } from './loaders';

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
export async function fetchSearchData(url: string) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return response;
}

/**
 * Get environment vars
 *
 * @param urlPath the path for the page being loaded
 * @returns environment vars
 */
export const getEnv = urlPath => {
  const env = fileLoaderProcessEnvSchema.safeParse(process.env);
  if (!env.success) {
    env.error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load shared-config for ${urlPath}`
      );
    });
    throw new Error(
      `Environment variables missing for loading of shared-config required by ${urlPath}`
    );
  }
  return env;
};

/**
 * Adds the [[`SearchIndex`]] props to the page props
 * @param _context
 * @returns site props object
 */
export const withSearchIndex: MosaicMiddleware<SearchIndexSlice> = async (
  context: GetServerSidePropsContext
) => {
  const { res, resolvedUrl } = context;
  const isSnapshotFile = res.getHeader('X-Mosaic-Mode') === 'snapshot-file';
  const isSnapshotS3 = res.getHeader('X-Mosaic-Mode') === 'snapshot-s3';

  const matches = resolvedUrl.match(/(.*)[!/]/);
  const urlPath = matches?.length ? matches[1] : '';

  const mosaicUrl = isSnapshotS3 || isSnapshotFile ? '' : res.getHeader('X-Mosaic-Content-Url');
  const searchDataUrl = `${mosaicUrl}/search-data.json`;

  try {
    let searchIndexData;
    if (isSnapshotFile) {
      const env = getEnv(urlPath);
      const { MOSAIC_SNAPSHOT_DIR: mosaicSnapshotDir } = env.data;
      const filePath = path.join(process.cwd(), mosaicSnapshotDir, 'search-data.json');
      const rawSearchIndexData = await loadLocalFile(filePath);
      searchIndexData = JSON.parse(rawSearchIndexData);
    } else if (isSnapshotS3) {
      const s3Key = `/search-data.json`.replace(/^\//, '');
      const rawSearchIndexData = await loadS3File(s3Key);
      searchIndexData = JSON.parse(rawSearchIndexData);
    } else {
      const response = await fetchSearchData(searchDataUrl);
      if (response.ok && response.status !== 204) {
        searchIndexData = await response.json();
      } else {
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
      }
    }

    return { props: { searchIndex: searchIndexData } };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new MiddlewareError(500, searchDataUrl, [error.message], { show500: true });
    } else {
      console.error('unexpected error');
      throw new MiddlewareError(500, searchDataUrl, ['unexpected error'], { show500: true });
    }
  }
};
