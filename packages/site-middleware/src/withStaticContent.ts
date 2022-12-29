import path from 'path';
import fs from 'fs';

import { compileMDX } from './compileMdx.js';
import { MosaicMiddleware } from './createMiddlewareRunner.js';
import MiddlewareError from './MiddlewareError.js';
import { ContentProps } from './withContent.js';

/**
 * Adds the [[`ContentProps`]] object to the page props
 * @param context
 */
export const withStaticContent: MosaicMiddleware<ContentProps> = async context => {
  const { resolvedUrl, res } = context;

  if (res.getHeader('X-Mosaic-Mode') !== 'static') {
    return {};
  }

  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  // Find the absolute path for  the file/dir requested
  let filePath = path.posix.join(process.cwd(), mosaicSnapshotDir, resolvedUrl);
  try {
    const stats = fs.statSync(filePath);
    if (stats !== undefined) {
      if (stats.isDirectory()) {
        filePath = path.posix.join(filePath, 'index');
      }
      const realPath = fs.realpathSync(filePath);
      const extname = path.extname(realPath);
      const data = fs.readFileSync(realPath, 'utf-8');
      const text = data.toString();

      if (extname === '.json') {
        return { props: { type: 'json', ...JSON.parse(text) } };
      }

      if (extname === '.mdx') {
        const mdxSource = await compileMDX(text);
        return { props: { type: 'mdx', source: mdxSource, raw: text } };
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
      throw new MiddlewareError(500, resolvedUrl, [error.message], { show500: true });
    } else {
      console.error('unexpected error');
      throw new MiddlewareError(500, resolvedUrl, ['unexpected error'], { show500: true });
    }
  }
  throw new MiddlewareError(404, resolvedUrl, [`Could not find any content for ${resolvedUrl}`], {
    show404: true
  });
};
