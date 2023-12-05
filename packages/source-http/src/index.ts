import { switchMap } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

import { createProxyAgent } from './proxyAgent.js';
import { fromDynamicImport } from './fromDynamicImport.js';
import {
  createHttpSource,
  type HttpSourceResponseTransformerType,
  httpSourceCreatorSchema
} from './createHttpSource.js';

export {
  createProxyAgent,
  createHttpSource,
  HttpSourceResponseTransformerType,
  httpSourceCreatorSchema
};

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
      switchMap(({ transformer }) =>
        createHttpSource<Page, Page>({ ...options, transformer }, sourceConfig)
      )
    );
  }
};

export default HttpSource;
