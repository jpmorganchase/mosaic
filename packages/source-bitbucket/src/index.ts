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
  prefixDir?: string;
}> = {
  create(options, { serialiser, pageExtensions }): Observable<Page[]> {
    const repo = new Repo(options);

    const rootDir = path.join(repo.dir, options.subfolder);
    const watchFolder$: Observable<Page<{}>[]> = localFolderSource.create(
      {
        rootDir,
        prefixDir: options.prefixDir,
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
          const baseDir = path.join(rootDir, page.fullPath.replace(options.prefixDir, ''));
          out.push(
            _merge({}, page, {
              lastModified: new Date(
                await repo.getLatestCommitDate(path.relative(repo.dir, baseDir))
              ).getTime()
            })
          );
        }
        return out;
      })
    );
  }
};

export default BitbucketSource;
