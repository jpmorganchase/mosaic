import fs from 'fs';
import path from 'path';
import { GetServerSidePropsContext } from 'next';
import type { SharedConfig, SharedConfigSlice } from '@jpmorganchase/mosaic-store';
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
 * Adds the [[`sharedConfig`]] props to the page props
 * @param _context
 * @param _params
 */
export const withSharedConfig: MosaicMiddleware<SharedConfigSlice> = async (
  context: GetServerSidePropsContext
) => {
  const { resolvedUrl, res } = context;
  const isSnapshotFile = res.getHeader('X-Mosaic-Mode') === 'snapshot-file';
  const isSnapshotS3 = res.getHeader('X-Mosaic-Mode') === 'snapshot-s3';

  const matches = resolvedUrl.match(/(.*)[!/]/);
  const urlPath = matches?.length ? matches[1] : '';
  try {
    let sharedConfig;
    if (isSnapshotFile) {
      const { snapshotDir } = getSnapshotFileConfig(urlPath);
      const filePath = path.join(process.cwd(), snapshotDir, urlPath, 'shared-config.json');
      let fileExists = false;
      try {
        await fs.promises.stat(filePath);
        fileExists = true;
      } catch {}
      if (fileExists) {
        const rawSharedConfig = await loadLocalFile(filePath);
        sharedConfig = JSON.parse(rawSharedConfig);
      }
    } else if (isSnapshotS3) {
      const s3Key = `${urlPath}/shared-config.json`.replace(/^\//, '');
      const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(s3Key);
      const { keyExists, loadKey } = createS3Loader(region, accessKeyId, secretAccessKey);

      const s3KeyExists = await keyExists(bucket, s3Key);
      if (s3KeyExists) {
        const rawSharedConfig = await loadKey(bucket, s3Key);
        sharedConfig = JSON.parse(rawSharedConfig);
      }
    } else {
      const mosaicUrl = res.getHeader('X-Mosaic-Content-Url');
      const response = await fetch(`${mosaicUrl}${urlPath}/shared-config.json`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        sharedConfig = await response.json();
      } else if (response.status !== 404) {
        throw Error(`${response.status} - ${response.statusText}`);
      }
    }
    if (sharedConfig) {
      const { config } = sharedConfig as { config: SharedConfig };
      return { props: { sharedConfig: config } };
    }
    return { props: {} };
  } catch (error) {
    console.error(error);
    let errorMessage = `[Mosaic][Middleware] Could not load any shared config for ${resolvedUrl}`;
    throw new MiddlewareError(500, resolvedUrl, [errorMessage], {
      show404: false,
      show500: true
    });
  }
};
