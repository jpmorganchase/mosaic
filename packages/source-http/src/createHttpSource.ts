import { forkJoin, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, SourceConfig } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

import { createProxyAgent } from './proxyAgent.js';
import { ResponseTransformer } from './fromDynamicImport.js';

export { createProxyAgent };

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
 */
export function createHttpSource<TResponse, TPage extends Page>(
  { configuredRequests, transformer, ...restOptions }: CreateHttpSourceParams<TResponse, TPage>,
  { schedule }: SourceConfig
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

  const delayMs = schedule.checkIntervalMins * 60000;
  let requests = configuredRequests || [];

  if (endpoints.length > 0) {
    requests = endpoints.map(endpoint => {
      let agent;
      const headers = requestHeaders
        ? (requestHeaders as HeadersInit)
        : {
            'Content-Type': 'application/json'
          };

      if (!noProxy?.test(endpoint) && proxyEndpoint) {
        agent = createProxyAgent(proxyEndpoint);
      }

      return new Request(new URL(endpoint), {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        agent,
        headers,
        timeout: requestTimeout
      });
    });
  }

  return timer(schedule.initialDelayMs, delayMs).pipe(
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
