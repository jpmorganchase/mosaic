import path from 'path';
import { GetServerSidePropsContext } from 'next';
import type { ContentProps, MosaicMode } from '@jpmorganchase/mosaic-types';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import {
  createS3Loader,
  getSnapshotFileConfig,
  getSnapshotS3Config,
  loadLocalFile
} from './loaders';
import { compileMDX } from './compileMdx.js';

if (typeof window !== 'undefined') {
  throw new Error('This file should not be loaded on the client.');
}
function stripParams(resolvedUrl: string) {
  const url = new URL(resolvedUrl, 'https://example.com');
  return url.pathname;
}

function normalizeUrl(url: string) {
  return /\/index$/.test(url) ? `${url}.mdx` : url;
}

async function loadSnapshotFile(url) {
  const { snapshotDir } = getSnapshotFileConfig(url);
  const normalizedUrl = normalizeUrl(url);
  const filePath = path.posix.join(process.cwd(), snapshotDir, normalizedUrl);
  try {
    return await loadLocalFile(filePath);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw new MiddlewareError(404, url, [`Could not read local file '${filePath}' for '${url}'`], {
      show404: true
    });
  }
}

async function loadSnapshotS3(url) {
  let text;
  try {
    const { accessKeyId, bucket, region, secretAccessKey } = getSnapshotS3Config(url);
    const s3Loader = createS3Loader(region, accessKeyId, secretAccessKey);
    const normalizedUrl = normalizeUrl(url);
    const s3Key = normalizedUrl.replace(/^\//, '');
    text = await s3Loader.loadKey(bucket, s3Key);
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw new MiddlewareError(404, url, [`Could not find an S3 object for '${url}'`], {
      show404: true
    });
  }
  return text;
}

async function loadActiveContent(url) {
  let text;
  const normalizedUrl = normalizeUrl(url);
  const response = await fetch(normalizedUrl);
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
    throw new MiddlewareError(404, url, [`Could not fetch any content for ${url}`], {
      show404: true
    });
  }
  return text;
}
/**
 * Adds the [[`type`, `source`, `raw`,]] object to the page props
 * @param context
 */
export const withMDXContent: MosaicMiddleware<ContentProps> = async (
  context: GetServerSidePropsContext
) => {
  const { resolvedUrl } = context;
  const mosaicMode = context.res.getHeader('X-Mosaic-Mode' || 'active') as MosaicMode;
  const extname = path.extname(resolvedUrl);
  const pathname = stripParams(resolvedUrl);
  // Any urls which are not prefixed, will default to MDX
  const isMDX = extname === '.mdx' || extname === '';
  if (!isMDX) {
    return {};
  }
  let text;
  if (mosaicMode === 'snapshot-file') {
    text = await loadSnapshotFile(pathname);
  } else if (mosaicMode === 'snapshot-s3') {
    text = await loadSnapshotS3(pathname);
  } else {
    const mosaicUrl = context.res.getHeader('X-Mosaic-Content-Url');
    const fetchedResult = await loadActiveContent(`${mosaicUrl}${pathname}`);
    const isRedirect = typeof fetchedResult === 'object';
    if (isRedirect) {
      return fetchedResult;
    }
    text = fetchedResult;
  }
  try {
    const mdxSource = await compileMDX(text);
    return { props: { type: 'mdx', source: mdxSource, raw: text } };
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      throw new MiddlewareError(500, resolvedUrl, [error.message], { show500: true });
    } else {
      throw new MiddlewareError(500, resolvedUrl, ['unexpected error'], { show500: true });
    }
  }
};
