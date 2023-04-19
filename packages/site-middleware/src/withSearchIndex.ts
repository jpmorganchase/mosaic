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

const searchDataFile = 'search-data-condensed.json';
const searchConfigFile = 'search-config.json';

const getSnapshotFile = async (urlPath, targetPath) => {
  const { snapshotDir } = getSnapshotFileConfig(urlPath);
  const filePath = path.join(process.cwd(), snapshotDir, targetPath);
  try {
    await fs.promises.stat(filePath);
    const rawSearchIndex = await loadLocalFile(filePath);
    return JSON.parse(rawSearchIndex);
  } catch {
    console.warn(`Could not load data from ${urlPath}/${targetPath}`);
    return false;
  }
};

const getSnapshotS3File = async (urlPath, targetPath) => {
  const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(targetPath);
  const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);
  const s3KeyExists = await keyExists(bucket, targetPath);
  if (s3KeyExists) {
    const rawSearchIndex = await loadKey(bucket, targetPath);
    return JSON.parse(rawSearchIndex);
  } else {
    console.warn(`Could not load data from ${urlPath}/${targetPath}`);
    return false;
  }
};

const getFechedFile = async (mosaicUrl, targetPath) => {
  const response = await fetch(`${mosaicUrl}/${targetPath}`, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (response.ok) {
    return await response.json();
  } else if (response.status !== 404) {
    throw Error(`${response.status} - ${response.statusText}`);
  } else {
    console.warn(`Could not load data from ${mosaicUrl}/${targetPath}`);
    return false;
  }
};

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
    let searchConfig;
    if (isSnapshotFile) {
      searchIndex = await getSnapshotFile(urlPath, searchDataFile);
      searchConfig = await getSnapshotFile(urlPath, searchConfigFile);
    } else if (isSnapshotS3) {
      searchIndex = await getSnapshotS3File(urlPath, searchDataFile);
      searchConfig = await getSnapshotS3File(urlPath, searchConfigFile);
    } else {
      const mosaicUrl = res.getHeader('X-Mosaic-Content-Url');
      searchIndex = await getFechedFile(mosaicUrl, searchDataFile);
      searchConfig = await getFechedFile(mosaicUrl, searchConfigFile);
    }
    if (searchIndex && searchConfig) {
      return { props: { searchConfig, searchIndex } };
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
