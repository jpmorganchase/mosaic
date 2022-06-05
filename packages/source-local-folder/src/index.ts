import { concatMap, delay, merge, Observable, of, switchMap } from 'rxjs';
import glob from 'fast-glob';
import path from 'path';
import fs from 'fs';
import _merge from 'lodash/merge';

import type Page from '@pull-docs/types/dist/Page';

import fromFsWatch from './fromFsWatch';

function createFileGlob(url, pageExtensions) {
  if (pageExtensions.length === 1) {
  return `${url}${pageExtensions[0]}`;
  }
  return `${url}{${pageExtensions.join(',')}}`
}

export function create(
  options: {
    extensions: string[];
    rootDir: string;
  },
  { parser }
): Observable<Page[]> {
  return merge(of(null), fromFsWatch(options.rootDir, { recursive: true })).pipe(
    delay(1000),
    switchMap(() =>
      glob(createFileGlob('**/*', options.extensions), { cwd: options.rootDir })
    ),
    concatMap(
      async (filepaths: string[]) =>
        await Promise.all(
          filepaths.map(async (filepath: string) => {
            const fullPath = path.join(options.rootDir, filepath);
            return _merge(await parser.deserialiseFromDisk(fullPath, fullPath), {
              // This will be replaced with a string if the AliasPlugin is being used
              friendlyRoute: { $ref: '#/route' },
              lastModified: new Date(await getLastModifiedDate(fullPath)).getTime(),
              route: `/${filepath}`,
              path: fullPath
            });
          })
        )
    )
  );
}

async function getLastModifiedDate(route) {
  const resolvedRoute = await fs.promises.realpath(route);
  const stats = await fs.promises.stat(resolvedRoute);
  return stats?.mtimeMs ? stats.mtimeMs : 0;
}
