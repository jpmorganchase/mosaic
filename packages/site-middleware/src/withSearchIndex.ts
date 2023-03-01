import fs from 'fs';
import path from 'path';
import { GetServerSidePropsContext } from 'next';
import type { SearchIndexSlice } from '@jpmorganchase/mosaic-store';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import {
  createS3Loader,
  getSnapshotFileConfig,
  getSnapshotS3Config,
  loadLocalFile
} from './loaders';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

/**
 * Adds the [[`searchIndex`]] props to the page props
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

  try {
    let searchIndex;
    if (isSnapshotFile) {
      const { snapshotDir } = getSnapshotFileConfig(urlPath);
      const filePath = path.join(process.cwd(), snapshotDir, 'search-data.json');
      let fileExists = false;
      try {
        await fs.promises.stat(filePath);
        fileExists = true;
      } catch {}

      if (fileExists) {
        const rawSearchIndex = await loadLocalFile(filePath);
        searchIndex = JSON.parse(rawSearchIndex);
      }
    } else if (isSnapshotS3) {
      const s3Key = `/search-data.json`.replace(/^\//, '');
      const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(s3Key);
      const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
      const s3KeyExists = await keyExists(bucket, s3Key);
      if (s3KeyExists) {
        const rawSearchIndex = await loadKey(bucket, s3Key);
        searchIndex = JSON.parse(rawSearchIndex);
      }
    } else {
      const mosaicUrl = res.getHeader('X-Mosaic-Content-Url');
      const response = await fetch(`${mosaicUrl}/search-data.json`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        searchIndex = await response.json();
      } else if (response.status !== 404) {
        throw Error(`${response.status} - ${response.statusText}`);
      }
    }
    if (searchIndex) {
      return { props: { searchIndex } };
    }
    return { props: {} };
  } catch (error) {
    console.error(error);
    let errorMessage = `Could not load any search index for ${resolvedUrl}`;
    throw new MiddlewareError(500, resolvedUrl, [errorMessage], {
      show404: false,
      show500: true
    });
  }
};
