import { defer, delay, merge, mergeMap, Observable, switchMap, tap } from 'rxjs';
import path from 'path';
import _merge from 'lodash/merge';
import Repo from './Repo';
import fromCommitChange from './fromCommitChange';

import type Page from '@pull-docs/types/dist/Page';
import * as localFolderSource from '@pull-docs/source-local-folder';

export function create(
  options: {
    repo: string;
    credentials: string;
    branch: string;
    remote: string;
    extensions: string[];
    namespaceDir: string;
  },
  { parser }
): Observable<Page[]> {
  const repo = new Repo(options);

  const watchFolder$: Observable<Page[]> = localFolderSource.create(
    {
      rootDir: path.resolve(repo.dir),
      extensions: options.extensions
    },
    { parser }
  );
  const commits$ = fromCommitChange(repo);

  return merge(
    defer(() => repo.init()),
    commits$
  ).pipe(
    delay(1000),
    switchMap(() => watchFolder$),
    mergeMap(async (pages: Page[]) => {
      const out = [];
      for (const page of pages) {
        const pathFromCloneDir = path.relative(repo.dir, page.path);
        const route = options.namespaceDir
          ? `/${path.join(options.namespaceDir, pathFromCloneDir)}`
          : `/${pathFromCloneDir}`;
        out.push(
          _merge({}, page, {
              // This will be replaced with a string if the AliasPlugin is being used
              friendlyRoute: { $ref: '#/route' },
              lastModified: new Date(await repo.getLatestCommitDate(pathFromCloneDir)).getTime(),
            route
          })
        );
      }
      return out;
    })
  );
}
