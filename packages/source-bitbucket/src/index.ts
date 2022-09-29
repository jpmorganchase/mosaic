import { defer, delay, merge, mergeMap, Observable, switchMap } from 'rxjs';
import path from 'path';
import _merge from 'lodash/merge';

import type Page from '@pull-docs/types/dist/Page';
import type Source from '@pull-docs/types/dist/Source';
import localFolderSource from '@pull-docs/source-local-folder';

import Repo from './Repo';
import fromCommitChange from './fromCommitChange';

export interface BitbucketSourceOptions {
  /**
   * The Bitbucket Repository URL
   */
  repo: string;
  /**
   * Credentials used to read/write from the Repository
   */
  credentials: string;
  /**
   * The Git branch name to checkout
   */
  branch: string;
  /**
   * The name of the git remot to use
   */
  remote: string;
  /**
   * The folder within the repository that contains the docs
   */
  subfolder: string;
  /**
   * Collection of file extensions to look for
   */
  extensions: string[];
  /**
   * Add to use a folder prefix
   */
  prefixDir?: string;
}

const BitbucketSource: Source<BitbucketSourceOptions> = {
  create(options, { serialiser, pageExtensions }): Observable<Page[]> {
    const { credentials, remote, branch, repo: repoUrl, prefixDir, extensions } = options;
    const repo = new Repo(credentials, remote, branch, repoUrl);

    const rootDir = path.join(repo.dir, options.subfolder);

    const watchFolder$: Observable<Page<{}>[]> = localFolderSource.create(
      {
        rootDir,
        prefixDir,
        extensions
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
          const baseDir = path.join(rootDir, page.fullPath.replace(prefixDir || '', ''));
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
