import { forkJoin, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, Source, SourceConfig } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';

import { createProxyAgent } from './proxyAgent.js';
import { fromDynamicImport, ResponseTransformer } from './fromDynamicImport.js';

export { createProxyAgent };

export const schema = z.object({
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
  transformResponseToPagesModulePath: z
    .string({
      description: `The path to a module that exports a function to transform request responses into Pages. The transformer must be a default export.
      If omitted, the raw request responses are returned unmodified`
    })
    .optional(),
  transformerOptions: z.unknown().optional()
});

export type HttpSourceOptions = z.input<typeof schema>;
export type HttpSourceResponseTransformerType<TResponse, TOptions> = ResponseTransformer<
  TResponse,
  TOptions
>;

export interface CreateHttpSourceParams extends z.input<typeof schema> {
  configuredRequests?: Request[];
}

/**
 * For use inside *other* sources.
 * Allows the return type to be defined
 */
export function createHttpSource<TResponse>(
  { configuredRequests, ...restOptions }: CreateHttpSourceParams,
  { schedule }: SourceConfig
) {
  const {
    endpoints,
    prefixDir,
    transformResponseToPagesModulePath,
    transformerOptions,
    proxyEndpoint,
    noProxy,
    requestHeaders,
    requestTimeout
  } = validateMosaicSchema(schema, restOptions);
  const delayMs = schedule.checkIntervalMins * 60000;
  const applyTransformer = transformResponseToPagesModulePath !== undefined;
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

  return fromDynamicImport<TResponse, typeof transformerOptions>(
    transformResponseToPagesModulePath
  ).pipe(
    switchMap(({ transformer }) =>
      timer(schedule.initialDelayMs, delayMs).pipe(
        switchMap(() => {
          const fetches = requests.map((request, index) =>
            fromHttpRequest<TResponse>(request).pipe(
              map(response => {
                if (isErrorResponse<TResponse>(response)) {
                  return [];
                }

                const result =
                  applyTransformer && transformer !== null
                    ? transformer(response, prefixDir, index, transformerOptions)
                    : response;

                return result;
              })
            )
          );
          return forkJoin(fetches).pipe(map(result => result.flat()));
        })
      )
    )
  );
}

const HttpSource: Source<HttpSourceOptions> = {
  create(options, sourceConfig) {
    return createHttpSource<Page>(options, sourceConfig);
  }
};

export default HttpSource;
