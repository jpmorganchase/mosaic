import { map } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

import { fromDynamicImport } from './fromDynamicImport.js';
import {
  createHttpSource,
  type HttpSourceResponseTransformerType,
  httpSourceCreatorSchema
} from './createHttpSource.js';

export { createHttpSource, HttpSourceResponseTransformerType, httpSourceCreatorSchema };

export const schema = httpSourceCreatorSchema.merge(
  z.object({
    transformResponseToPagesModulePath: z.string({
      description: `The path to a module that exports a function to transform request responses into Pages. The transformer must be a default export.
      If omitted, the raw request responses are returned unmodified`
    })
  })
);

export type HttpSourceOptions = z.input<typeof schema>;

const HttpSource: Source<HttpSourceOptions> = {
  create(options, sourceConfig) {
    const { transformResponseToPagesModulePath } = validateMosaicSchema(schema, options);

    return fromDynamicImport<Page>(transformResponseToPagesModulePath).pipe(
      switchMap(({ transformer }) => {
        const httpSource$ = createHttpSource<Page, Page>({ ...options, transformer }, sourceConfig);
        return httpSource$.pipe(
          map(({ results, errors }) => {
            if (errors.length > 0) {
              console.error('[Mosaic][Source-Http] Failed requests:', errors);
            }
            return results.map(result => result.data);
          })
        );
      })
    );
  }
};

export default HttpSource;
