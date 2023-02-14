// @ts-nocheck
import path from 'path';
import { Observable, of, switchMap, from } from 'rxjs';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import GitRepoSource, { schema } from '@jpmorganchase/mosaic-source-git-repo';
import createContent from './createContent.js';

export type TypeDocSourceOptions = z.infer<typeof schema>;

const { create: createRepoSource } = GitRepoSource;

const TypeDocSource: Source<TypeDocSourceOptions> = {
  create(options, config): Observable<Page[]> {
    const watchRepo$: Observable<Page[]> = createRepoSource(options, config);

    return watchRepo$.pipe(
      switchMap(pages => {
        console.log('typedocSource');

        // {
        //   content: HTMLDOC,
        //   fullPath: '/typedocs/modules/ViewStack.html',
        //   lastModified: 1649330233000
        // }

        const sourcePages = pages.map(async page => {
          // const content = await createContent(page.content)
          // const pageContent = content.toString()

          return {
            content: '',
            fullPath: page.route,
            lastModified: page.lastModified
          };
        });

        return of(sourcePages);
      })
    );
  }
};

export default TypeDocSource;
