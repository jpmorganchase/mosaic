import { forkJoin, Observable, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { fromDynamicImport } from './fromDynamicImport.js';

export const schema = z.object({
  checkIntervalMins: z.number().optional().default(5),
  endpoints: z.array(z.string()).nonempty('Please provide a URL'),
  initialDelayMs: z.number().optional().default(1000),
  prefixDir: z.string({ required_error: 'Please provide a prefixDir' }),
  transformResponseToPagesModulePath: z.string({
    description: `The path to a module that exports a function to transform request responses into Pages. The transformer must bea default export.
      An optional request config object (https://developer.mozilla.org/en-US/docs/Web/API/Request) can also be provided to further configure requests.`,
    required_error: 'Please provide the path to the module for transforming responses'
  })
});

export type HttpSourceOptions = z.infer<typeof schema>;

const HttpSource: Source<HttpSourceOptions> = {
  create(options): Observable<Page[]> {
    const {
      checkIntervalMins,
      initialDelayMs,
      endpoints,
      prefixDir,
      transformResponseToPagesModulePath
    } = schema.parse(options);

    const delayMs = checkIntervalMins * 60000;

    return fromDynamicImport(transformResponseToPagesModulePath).pipe(
      switchMap(({ transformer, requestConfig }) =>
        timer(initialDelayMs, delayMs).pipe(
          switchMap(() => {
            const requests = endpoints.map(endpoint => {
              const request = requestConfig ? new Request(endpoint, requestConfig) : endpoint;
              return fromHttpRequest<Page[]>(request).pipe(
                map(response =>
                  isErrorResponse<Page[]>(response) ? [] : transformer(response, prefixDir)
                )
              );
            });
            return forkJoin(requests).pipe(map(result => result.flat()));
          })
        )
      )
    );
  }
};

export default HttpSource;
