import { Observable, of, switchMap } from 'rxjs';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import GitRepoSource, { schema } from '@jpmorganchase/mosaic-source-git-repo';

export type TypeDocSourceOptions = z.infer<typeof schema>;

const { create: createRepoSource } = GitRepoSource;

const TypeDocSource: Source<TypeDocSourceOptions> = {
  create(options, config): Observable<Page[]> {
    const watchRepo$: Observable<Page[]> = createRepoSource(options, config);

    return watchRepo$.pipe(
      switchMap(pages => {
        console.log('PAGES from typedoc', pages);
        return of(pages);
      })
    );
  }
};

export default TypeDocSource;
