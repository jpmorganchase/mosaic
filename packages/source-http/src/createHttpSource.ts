import { forkJoin, of, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, SourceConfig } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
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
) {
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
        : {
            'Content-Type': 'application/json'
          };

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
            if (isErrorResponse<TResponse>(response)) {
              return [];
            }

            return transformer(response, prefixDir, index, transformerOptions);
          })
        )
      );
      return forkJoin(fetches).pipe(map(result => result.flat()));
    })
  );
}
