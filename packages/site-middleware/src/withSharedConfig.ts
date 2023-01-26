import assert from 'assert';
import path from 'path';
import { GetServerSidePropsContext } from 'next';
import type { SharedConfig, SharedConfigSlice } from '@jpmorganchase/mosaic-store';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import { loadLocalFile, loadS3File } from './loaders';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
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
  const isSnapshotFile = res.getHeader('X-Mosaic-Mode') === 'snapshot-file';
  const isSnapshotS3 = res.getHeader('X-Mosaic-Mode') === 'snapshot-s3';

  const matches = resolvedUrl.match(/(.*)[!/]/);
  const urlPath = matches?.length ? matches[1] : '';
  try {
    let sharedConfig;
    if (isSnapshotFile) {
      assert(
        process.env.MOSAIC_SNAPSHOT_DIR,
        'Cannot read snapshot - MOSAIC_SNAPSHOT_DIR environment var is missing'
      );
      const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
      const filePath = path.join(process.cwd(), mosaicSnapshotDir, urlPath, 'shared-config.json');
      const rawSharedConfig = await loadLocalFile(filePath);
      sharedConfig = JSON.parse(rawSharedConfig);
    } else if (isSnapshotS3) {
      const s3Key = `${urlPath}/shared-config.json`.replace(/^\//, '');
      const rawSharedConfig = await loadS3File(s3Key);
      sharedConfig = JSON.parse(rawSharedConfig);
    } else {
      const mosaicUrl = res.getHeader('X-Mosaic-Content-Url');
      const response = await fetch(`${mosaicUrl}${urlPath}/shared-config.json`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      sharedConfig = await response.json();
    }
    const { config } = sharedConfig as { config: SharedConfig };
    return { props: { sharedConfig: config } };
  } catch (error) {
    let errorMessage = `Could not load any shared config for ${resolvedUrl}`;
    throw new MiddlewareError(500, resolvedUrl, [errorMessage], {
      show404: false,
      show500: true
    });
  }
};
