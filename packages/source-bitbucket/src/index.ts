import { defer, delay, merge, mergeMap, Observable, switchMap } from 'rxjs';
import path from 'path';
import _merge from 'lodash/merge';

import type Page from '@pull-docs/types/dist/Page';
import type Source from '@pull-docs/types/dist/Source';
import localFolderSource from '@pull-docs/source-local-folder';

import Repo from './Repo';
import fromCommitChange from './fromCommitChange';

const BitbucketSource: Source<{
  repo: string;
  credentials: string;
  branch: string;
  remote: string;
  subfolder: string;
  extensions: string[];
  namespaceDir: string;
}> = {
  create(options, { serialiser }) {
    const repo = new Repo(options);

    const watchFolder$: Observable<Page[]> = localFolderSource.create(
      {
        rootDir: path.resolve(repo.dir, options.subfolder),
        extensions: options.extensions
      },
      { serialiser }
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
};

export default BitbucketSource;
