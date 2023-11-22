import { forkJoin, Observable, timer } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { z } from 'zod';
import type { Page, Source } from '@jpmorganchase/mosaic-types';
import { fromHttpRequest, isErrorResponse } from '@jpmorganchase/mosaic-from-http-request';
import { sourceScheduleSchema, validateMosaicSchema } from '@jpmorganchase/mosaic-schemas';
import proxyAgentPkg from 'https-proxy-agent';

import { fromDynamicImport, type ResponseTransformer } from './fromDynamicImport.js';

const { HttpsProxyAgent } = proxyAgentPkg;

export const schema = z.object({
  schedule: sourceScheduleSchema.optional(),
  endpoints: z.array(z.string().url()).default([]),
  prefixDir: z.string({ required_error: 'Please provide a prefixDir' }),
  requestTimeout: z.number().optional().default(5000),
  proxyEndpoint: z.string().url().optional(),
  requestHeaders: z.object({}).passthrough().optional(),
  transformResponseToPagesModulePath: z
    .string({
      description: `The path to a module that exports a function to transform request responses into Pages. The transformer must be a default export.
      If omitted, the raw request responses are returned unmodified`
    })
    .optional(),
  transformerOptions: z.unknown().optional()
});

export type HttpSourceOptions = z.infer<typeof schema>;
export type HttpSourceResponseTransformerType<TResponse, TOptions> = ResponseTransformer<
  TResponse,
  TOptions
>;

const HttpSource: Source<HttpSourceOptions> = {
  create(options, { schedule }): Observable<Page[]> {
    const {
      endpoints,
      prefixDir,
      transformResponseToPagesModulePath,
      transformerOptions,
      proxyEndpoint,
      requestTimeout,
      requestHeaders
    } = validateMosaicSchema(schema, options);
    const delayMs = schedule.checkIntervalMins * 60000;
    const applyTransformer = transformResponseToPagesModulePath !== undefined;

    const requestConfig = {
      agent: proxyEndpoint ? new HttpsProxyAgent(proxyEndpoint) : undefined,
      timeout: requestTimeout,
      headers: {
        ...(requestHeaders as HeadersInit)
      }
    };

    return fromDynamicImport<Page[], typeof transformerOptions>(
      transformResponseToPagesModulePath
    ).pipe(
      switchMap(({ transformer }) =>
        timer(schedule.initialDelayMs, delayMs).pipe(
          switchMap(() => {
            const requests = endpoints.map((endpoint, index) => {
              const request = new Request(endpoint, requestConfig);
              return fromHttpRequest<Page[]>(request).pipe(
                map(response => {
                  if (isErrorResponse<Page[]>(response)) {
                    return [];
                  }

                  return applyTransformer && transformer !== null
                    ? transformer(response, prefixDir, index, transformerOptions)
                    : response;
                })
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
