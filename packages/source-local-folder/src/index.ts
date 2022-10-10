import { concatMap, delay, merge, Observable, of, switchMap } from 'rxjs';
import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import lodashMerge from 'lodash/merge';

import type Source from '@jpmorganchase/mosaic-types/dist/Source';
import type Page from '@jpmorganchase/mosaic-types/dist/Page';

import fromFsWatch from './fromFsWatch';

export interface LocalFolderSourceOptions {
  extensions: string[];
  prefixDir?: string;
  rootDir: string;
}

const LocalFolderSource: Source<LocalFolderSourceOptions> = {
  create(options, { serialiser }): Observable<Page<{}>[]> {
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
          await Promise.all(
            filepaths.map(async (filepath: string) => {
              const fullPath = path.join(options.rootDir, filepath);
              return lodashMerge(
                {},
                await serialiser.deserialise(fullPath, await fs.promises.readFile(fullPath)),
                {
                  lastModified: new Date(await getLastModifiedDate(fullPath)).getTime(),
                  fullPath: `/${
                    options.prefixDir ? path.join(options.prefixDir, filepath) : filepath
                  }`.replace(/^\/{2,}/, '/')
                }
              );
            })
          )
      )
    );
  }
};

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

export default LocalFolderSource;
