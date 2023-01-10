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
  const isStatic = res.getHeader('X-Mosaic-Mode') === 'static';

  if (!isStatic) {
    return {};
  }
  const mosaicSnapshotDir = process.env.MOSAIC_SNAPSHOT_DIR || '';
  // Find the absolute path for  the file/dir requested
  const filePath = path.posix.join(process.cwd(), mosaicSnapshotDir, resolvedUrl);

  try {
    const realPath = await fs.promises.realpath(filePath);
    const extname = path.extname(realPath);
    if (extname === '.mdx') {
      const data = await fs.promises.readFile(filePath, 'utf-8');
      const text = data.toString();
      const mdxSource = await compileMDX(text);
      return { props: { type: 'mdx', source: mdxSource, raw: text } };
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
