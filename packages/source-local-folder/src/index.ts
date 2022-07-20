import { concatMap, delay, merge, Observable, of, switchMap } from 'rxjs';
import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import _merge from 'lodash/merge';

import type Source from '@pull-docs/types/dist/Source';
import type Page from '@pull-docs/types/dist/Page';

import fromFsWatch from './fromFsWatch';

const LocalFolderSource: Source<{
  extensions: string[];
  prefixDir?: string;
  rootDir: string;
}> = {
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
              return _merge(
                {},
                await serialiser.deserialise(fullPath, await fs.promises.readFile(fullPath)),
                {
                  lastModified: new Date(await getLastModifiedDate(fullPath)).getTime(),
                  fullPath: `/${path.join(options.prefixDir || '/', filepath)}`.replace(/^\/{2}/, '/'),
                  hddPath: fullPath
                }
              );
            })
          )
      )
    );
  }
};

async function getLastModifiedDate(fullPath) {
  const resolvedRoute = await fs.promises.realpath(fullPath);
  const stats = await fs.promises.stat(resolvedRoute);
  return stats?.mtimeMs ? stats.mtimeMs : 0;
}

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
    return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`;
}

export default LocalFolderSource;
