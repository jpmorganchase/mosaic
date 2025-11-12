import { of, switchMap, timer, Observable, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { z } from 'zod';
import {
  Page,
  SourceConfig,
  SourceResultSummary,
  SourceResult,
  SourceError,
  SourceHttpError,
  SourceThrownError
} from '@jpmorganchase/mosaic-types';
import {
  fromHttpRequest,
  isFromHttpRequestError,
  FromHttpRequestHttpError,
  isFromHttpRequestThrownError,
  FromHttpRequestThrownError
} from '@jpmorganchase/mosaic-from-http-request';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import { ProxyAgent, type HeadersInit, Request } from 'undici';

import { ResponseTransformer } from './fromDynamicImport.js';

export type HttpSourceResponseTransformerType<TResponse, TPage> = ResponseTransformer<
  TResponse,
  TPage
>;

export const httpSourceCreatorSchema = z.object({
  schedule: sourceScheduleSchema.optional(),
  endpoints: z.array(z.string().url()).optional().default([]),
  prefixDir: z.string({ required_error: 'Please provide a prefixDir' }),
  requestTimeout: z.number().optional().default(5000),
  proxyEndpoint: z.string().url().optional(),
  noProxy: z
    .any()
    .transform(val => new RegExp(val))
    .optional(),
  requestHeaders: z.object({}).passthrough().optional(),
  transformerOptions: z.unknown().optional()
});

export interface CreateHttpSourceParams<TResponse, TPage>
  extends z.input<typeof httpSourceCreatorSchema> {
  configuredRequests?: Request[];
  transformer: HttpSourceResponseTransformerType<TResponse, TPage>;
}

/**
 * For use inside *other* sources.
 * Allows a transformer function to be passed directly without the need for dynamic imports.
 *
 * SourceConfig is also optional here so that scheduling can be ignored.
 */
export function createHttpSource<TResponse, TPage = Page>(
  { configuredRequests, transformer, ...restOptions }: CreateHttpSourceParams<TResponse, TPage>,
  sourceConfig?: SourceConfig
): Observable<SourceResultSummary<TPage>> {
  const {
    endpoints,
    prefixDir,
    proxyEndpoint,
    noProxy,
    requestHeaders,
    requestTimeout,
    transformerOptions
  } = validateMosaicSchema(httpSourceCreatorSchema, restOptions);

  const delayMs = (sourceConfig?.schedule.checkIntervalMins || 30) * 60000;
  const initialDelayMs = sourceConfig?.schedule.initialDelayMs || 0;
  let requests = configuredRequests || [];

  if (endpoints.length > 0) {
    requests = endpoints.map(endpoint => {
      let dispatcher;
      const headers = requestHeaders
        ? (requestHeaders as HeadersInit)
        : { 'Content-Type': 'application/json' };

      if (!noProxy?.test(endpoint) && proxyEndpoint) {
        dispatcher = new ProxyAgent(proxyEndpoint);
      }

      return new Request(new URL(endpoint), {
        dispatcher,
        headers,
        signal: AbortSignal.timeout(requestTimeout)
      });
    });
  }

  // if there is no schedule then emit once, immediately, and then complete
  const schedule$ = sourceConfig?.schedule ? timer(initialDelayMs, delayMs) : of(1);

  return schedule$.pipe(
    switchMap(() => {
      const fetches = requests.map((request, index) =>
        fromHttpRequest<TResponse>(request).pipe(
          map(response => {
            if (isFromHttpRequestError(response)) {
              const httpResponse = response as FromHttpRequestHttpError;
              const sourceHttpError: SourceHttpError = {
                type: 'error' as const,
                kind: 'http',
                index,
                url: request.url,
                message: httpResponse.message,
                status: httpResponse.status,
                statusText: httpResponse.statusText,
                headers: httpResponse.headers
              };
              return sourceHttpError;
            } else if (isFromHttpRequestThrownError(response)) {
              const thrownError = response as FromHttpRequestThrownError;
              const sourceThrowError: SourceThrownError = {
                type: 'error' as const,
                kind: 'thrown',
                index,
                url: request.url,
                message: thrownError.message
              };
              return sourceThrowError;
            }
            return {
              type: 'success' as const,
              kind: 'result',
              index,
              url: request.url,
              data: transformer(response, prefixDir, index, transformerOptions)
            };
          }),
          catchError((error: Error) => {
            return of({
              type: 'error' as const,
              kind: 'thrown',
              message: error.message,
              index,
              url: request.url
            });
          })
        )
      );

      return forkJoin(fetches).pipe(
        map(fetchedResults => {
          const results: SourceResult<TPage>[] = [];
          const errors: SourceError[] = [];
          for (const fetchedResult of fetchedResults) {
            if (fetchedResult.type === 'success' && fetchedResult.kind === 'result') {
              const pages = fetchedResult.data.map(data => ({ ...fetchedResult, data }));
              results.push(...pages);
            } else if (fetchedResult.type === 'error' && fetchedResult.kind === 'http') {
              errors.push(fetchedResult as SourceHttpError);
            } else if (fetchedResult.type === 'error' && fetchedResult.kind === 'thrown') {
              errors.push(fetchedResult as SourceThrownError);
            }
          }
          return { results, errors };
        })
      );
    })
  );
}
