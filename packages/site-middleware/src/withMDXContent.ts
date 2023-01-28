import path from 'path';
import { GetServerSidePropsContext } from 'next';
import type { ContentProps, MosaicMode } from '@jpmorganchase/mosaic-types';
import { fileLoaderProcessEnvSchema } from '@jpmorganchase/mosaic-schemas';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import { loadLocalFile, loadS3File } from './loaders/index.js';
import { compileMDX } from './compileMdx.js';
import { S3ServiceException } from '@aws-sdk/client-s3';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}

/**
 * Adds the [[`ContentProps`]] object to the page props
 * @param context
 */
export const withMDXContent: MosaicMiddleware<ContentProps> = async (
  context: GetServerSidePropsContext
) => {
  const { resolvedUrl } = context;
  const mosaicMode = context.res.getHeader('X-Mosaic-Mode' || 'active') as MosaicMode;
  const extname = path.extname(resolvedUrl);
  // Any urls which are not prefixed, will default to MDX
  const isMDX = extname === '.mdx' || extname === '';
  if (!isMDX) {
    return {};
  }

  const normalizedUrl = /\/index$/.test(resolvedUrl) ? `${resolvedUrl}.mdx` : resolvedUrl;

  let text;
  if (mosaicMode === 'snapshot-file') {
    const env = fileLoaderProcessEnvSchema.safeParse(process.env);
    if (!env.success) {
      env.error.issues.forEach(issue => {
        console.error(
          `Missing process.env.${issue.path.join()} environment variable required to load MDX for ${resolvedUrl}`
        );
      });
      throw new Error(`Environment variables missing for loading of MDX content ${resolvedUrl}`);
    }
    const { MOSAIC_SNAPSHOT_DIR: mosaicSnapshotDir } = env.data;
    const filePath = path.posix.join(process.cwd(), mosaicSnapshotDir, normalizedUrl);
    try {
      text = await loadLocalFile(filePath);
    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
      }
      throw new MiddlewareError(404, resolvedUrl, [`Could not read local file '${filePath}'`], {
        show404: true
      });
    }
  } else if (mosaicMode === 'snapshot-s3') {
    const s3Key = normalizedUrl.replace(/^\//, '');
    try {
      text = await loadS3File(s3Key);
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === 'NoSuchKey') {
        throw new MiddlewareError(
          404,
          resolvedUrl,
          [`Could not find an S3 object for key '${s3Key}'`],
          {
            show404: true
          }
        );
      } else {
        throw error;
      }
    }
  } else {
    const mosaicUrl = context.res.getHeader('X-Mosaic-Content-Url');
    const response = await fetch(`${mosaicUrl}${normalizedUrl}`);
    if (response.ok) {
      text = await response.text();
      // If redirect url was returned
    } else if (response.status === 302) {
      return {
        redirect: {
          destination: (await response.json()).redirect,
          permanent: true
        }
      };
    } else {
      throw new MiddlewareError(404, resolvedUrl, ['Could not fetch content'], {
        show404: true
      });
    }
  }
  try {
    const mdxSource = await compileMDX(text);
    return { props: { type: 'mdx', source: mdxSource, raw: text } };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new MiddlewareError(500, resolvedUrl, [error.message], { show500: true });
    } else {
      console.error('unexpected error');
      throw new MiddlewareError(500, resolvedUrl, ['unexpected error'], { show500: true });
    }
  }
};
