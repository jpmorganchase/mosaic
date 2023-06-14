import { concatMap, delay, merge, Observable, of, switchMap } from 'rxjs';
import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import { merge as lodashMerge } from 'lodash-es';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

import fromFsWatch from './fromFsWatch.js';

async function getLastModifiedDate(fullPath: string) {
  const resolvedRoute = await fs.promises.realpath(fullPath);
  const stats = await fs.promises.stat(resolvedRoute);
  return stats?.mtimeMs ? stats.mtimeMs : 0;
}

function createFileGlob(url: string, pageExtensions: string[]) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

export const schema = z.object({
  /**
   * Collection of file extensions to look for
   */
  extensions: z
    .string({ required_error: 'Please provide the collection of file extensions to look for' })
    .array()
    .nonempty(),
  /**
   * Add to use a folder prefix
   */
  prefixDir: z.string().optional(),
  /**
   * The root directory containing docs
   */
  rootDir: z.string({ required_error: 'Please provide a root directory name' })
});

export type LocalFolderSourceOptions = z.infer<typeof schema>;

const LocalFolderSource: Source<LocalFolderSourceOptions> = {
  create(options, { serialiser }): Observable<Page[]> {
    validateMosaicSchema(schema, options);
    return merge(of(null), fromFsWatch(options.rootDir, { recursive: true })).pipe(
      delay(1000),
      switchMap(() =>
        glob(createFileGlob('**', options.extensions), {
          cwd: options.rootDir,
          onlyFiles: true
        })
      ),
      concatMap(
        async (filepaths: string[]) =>
          // eslint-disable-next-line @typescript-eslint/return-await
          await Promise.all(
            filepaths.map(async (filepath: string) => {
              const fullPath = path.posix.join(options.rootDir, filepath);
              return lodashMerge(
                {},
                await serialiser.deserialise(fullPath, await fs.promises.readFile(fullPath)),
                {
                  lastModified: new Date(await getLastModifiedDate(fullPath)).getTime(),
                  fullPath: `/${
                    options.prefixDir ? path.posix.join(options.prefixDir, filepath) : filepath
                  }`.replace(/^\/{2,}/, '/')
                }
              );
            })
          )
      )
    );
  }
};

export default LocalFolderSource;
