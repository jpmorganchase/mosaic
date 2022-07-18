import { defer, delay, merge, mergeMap, Observable, switchMap } from 'rxjs';
import path from 'path';
import _merge from 'lodash/merge';

import type Page from '@pull-docs/types/dist/Page';
import type Source from '@pull-docs/types/dist/Source';
import localFolderSource from '@pull-docs/source-local-folder';

import Repo from './Repo';
import fromCommitChange from './fromCommitChange';
import { omit } from 'lodash';

const BitbucketSource: Source<{
  repo: string;
  credentials: string;
  branch: string;
  remote: string;
  subfolder: string;
  extensions: string[];
  namespaceDir: string;
}> = {
  create(options, { serialiser, pageExtensions }): Observable<Page[]> {
    const repo = new Repo(options);

    const rootDir = path.join(repo.dir, options.subfolder);
    const watchFolder$: Observable<Page<{ $hddFullPath: string }>[]> = localFolderSource.create(
      {
        rootDir,
        extensions: options.extensions
      },
      { serialiser, pageExtensions }
    );
    const commits$ = fromCommitChange(repo);

    return merge(
      defer(() => repo.init()),
      commits$
    ).pipe(
      delay(1000),
      switchMap(() => watchFolder$),
      mergeMap(async pages => {
        const out = [];
        for (const page of pages) {
          const pathFromCloneDir = path.relative(rootDir, page.$hddFullPath);
          const route = options.namespaceDir
            ? `/${path.join(options.namespaceDir, pathFromCloneDir)}`
            : `/${pathFromCloneDir}`;
          out.push(
            _merge({}, omit(page, '$hddFullPath'), {
              lastModified: new Date(
                await repo.getLatestCommitDate(path.relative(repo.dir, page.$hddFullPath))
              ).getTime(),
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
