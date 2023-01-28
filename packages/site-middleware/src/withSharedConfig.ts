import fs from 'fs';
import path from 'path';
import { GetServerSidePropsContext } from 'next';
import { fileLoaderProcessEnvSchema } from '@jpmorganchase/mosaic-schemas';
import type { SharedConfig, SharedConfigSlice } from '@jpmorganchase/mosaic-store';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import { loadLocalFile, loadS3File } from './loaders';
import { S3ServiceException } from '@aws-sdk/client-s3';

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
  const extname = path.extname(resolvedUrl);
  const isMDX = extname === '.mdx' || extname === '';
  if (!isMDX) {
    return {};
  }
  const matches = resolvedUrl.match(/(.*)[!/]/);
  const urlPath = matches?.length ? matches[1] : '';
  try {
    let sharedConfig = {};
    if (isSnapshotFile) {
      const env = fileLoaderProcessEnvSchema.safeParse(process.env);
      if (!env.success) {
        env.error.issues.forEach(issue => {
          console.error(
            `Missing process.env.${issue.path.join()} environment variable required to load shared-config for ${resolvedUrl}`
          );
        });
        throw new Error(
          `Environment variables missing for loading of shared-config required by ${resolvedUrl}`
        );
      }
      const { MOSAIC_SNAPSHOT_DIR: mosaicSnapshotDir } = env.data;
      const filePath = path.join(process.cwd(), mosaicSnapshotDir, urlPath, 'shared-config.json');
      if (fs.existsSync(filePath)) {
        const rawSharedConfig = await loadLocalFile(filePath);
        sharedConfig = JSON.parse(rawSharedConfig);
      }
    } else if (isSnapshotS3) {
      const s3Key = `${urlPath}/shared-config.json`.replace(/^\//, '');
      let rawSharedConfig;
      try {
        rawSharedConfig = await loadS3File(s3Key);
      } catch (error) {
        const is404 = error instanceof S3ServiceException && error.name === 'NoSuchKey';
        if (!is404) {
          throw error;
        }
      }
      if (rawSharedConfig) {
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
      }
    }
    const { config } = sharedConfig as { config: SharedConfig };
    return { props: { sharedConfig: config } };
  } catch (error) {
    let errorMessage = 'Could not load any shared config';
    throw new MiddlewareError(500, resolvedUrl, [errorMessage], {
      show404: false,
      show500: true
    });
  }
};
