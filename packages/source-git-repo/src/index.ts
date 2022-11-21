import { defer, delay, merge, mergeMap, Observable, switchMap } from 'rxjs';
import path from 'path';
import _merge from 'lodash/merge';
import { z } from 'zod';

import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { fileExtensionSchema } from '@jpmorganchase/mosaic-schemas';
import localFolderSource from '@jpmorganchase/mosaic-source-local-folder';

import Repo from './Repo';
import fromCommitChange from './fromCommitChange';

export { Repo };

export const schema = z.object({
  /**
   * The git repository URL without any protocol
   */
  repo: z.string({
    required_error: 'Please provide a git repository URL (without any protocol)'
  }),
  /**
   * Credentials used to read/write from the Repository
   * Personal Access tokens are preferred:
   * https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token
   */
  credentials: z.string({ required_error: 'Please provide credentials to access the repository' }),
  /**
   * The git branch name to checkout
   */
  branch: z.string({ required_error: ' Please provide the name of the branch to checkout' }),
  /**
   * The name of the git remote to use
   */
  remote: z.string({ required_error: 'Please provide the name of the git remote to use' }),
  /**
   * The folder within the git repository that contains the docs
   */
  subfolder: z.string({
    required_error:
      'Please provide the name of the folder within the repository that contains the docs'
  }),
  /**
   * Collection of file extensions to look for
   */
  extensions: fileExtensionSchema.array().nonempty(),
  /**
   * Add to use a folder prefix
   */
  prefixDir: z.string({ required_error: 'Please provide a prefix directory name' })
});

export type GitRepoSourceOptions = z.infer<typeof schema>;

const GitRepoSource: Source<GitRepoSourceOptions> = {
  create(options, { serialiser, pageExtensions }): Observable<Page[]> {
    schema.parse(options);
    const { credentials, remote, branch, repo: repoUrl, prefixDir, extensions } = options;
    const repo = new Repo(credentials, remote, branch, repoUrl);

    const rootDir = path.join(repo.dir, options.subfolder);

    const watchFolder$: Observable<Page[]> = localFolderSource.create(
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

export default GitRepoSource;
