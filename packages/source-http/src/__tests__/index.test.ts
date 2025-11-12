import { describe, expect, it, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { Observable, of, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ProxyAgent } from 'undici';

import { Page, SourceResultSummary } from '@jpmorganchase/mosaic-types';

import Source, { createHttpSource } from '../index.js';

vi.mock('undici', async importOriginal => {
  return {
    ...(await importOriginal()),
    ProxyAgent: vi.fn().mockImplementation(() => ({
      connect: vi.fn(),
      destroy: vi.fn(),
      close: vi.fn()
    }))
  };
});

vi.mock('../fromDynamicImport', async importOriginal => ({
  ...(await importOriginal()),
  fromDynamicImport: vi.fn().mockImplementation(() => of({ transformer: toUpperCaseTransformer }))
}));

function toUpperCaseTransformer(response) {
  return [response.name.toUpperCase()];
}

const endpoints: [string, string, string] = [
  'https://api.endpoint.com/1',
  'https://api.endpoint.com/2',
  'https://api.endpoint.com/3'
];

const schedule = {
  checkIntervalMins: 3,
  initialDelayMs: 100
};

const options = {
  endpoints,
  transformResponseToPagesModulePath: '',
  prefixDir: 'prefixDir'
};

const configuredRequestsOptions = {
  configuredRequests: endpoints.map(
    url =>
      new Request(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
  ),
  transformResponseToPagesModulePath: '',
  prefixDir: 'prefixDir'
};

export const successHandlers = [
  http.get(options.endpoints[0], () => {
    return HttpResponse.json({ name: 'Alice' });
  }),
  http.get(options.endpoints[1], () => {
    return HttpResponse.json({ name: 'Bob' });
  }),
  http.get(options.endpoints[2], () => {
    return HttpResponse.json({ name: 'Eve' });
  })
];

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' });
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  server.resetHandlers();
});

/**
 * This test validates the responses from an HTTP Source
 * It's main job is to validate that the responses are merged and transformed correctly.
 *
 * It is important that failed requests to an endpoint do not interfere with the results of successful requests
 */
describe('GIVEN an HTTP Source ', () => {
  describe('WHEN a fetch is successful', () => {
    beforeEach(() => {
      server.resetHandlers(...successHandlers);
    });

    it('should merge results from all endpoints into 1 array', () =>
      new Promise<void>(done => {
        const source$: Observable<SourceResultSummary<Page>> = createHttpSource(
          { ...options, transformer: toUpperCaseTransformer },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.results.length).toEqual(3);
            // Check the transformed values
            expect(result.results[0].data).toEqual('ALICE');
            expect(result.results[1].data).toEqual('BOB');
            expect(result.results[2].data).toEqual('EVE');
            // No errors
            expect(result.errors.length).toEqual(0);
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN a fetch is **NOT** successful', () => {
    it('should merge two valid results and one invalid response', () =>
      new Promise<void>(done => {
        server.resetHandlers(
          http.get(options.endpoints[0], () => HttpResponse.json({ name: 'Alice' })),
          http.get(options.endpoints[1], () => HttpResponse.json({ name: 'Bob' })),
          http.get(
            options.endpoints[2],
            () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
          )
        );

        const source$: Observable<SourceResultSummary<Page>> = createHttpSource(
          { ...options, transformer: toUpperCaseTransformer },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            // Only two successful results
            expect(result.results.length).toEqual(2);
            expect(result.results[0].data).toEqual('ALICE');
            expect(result.results[1].data).toEqual('BOB');
            // One error for the 404
            expect(result.errors.length).toEqual(1);
            expect(result.errors[0].url).toEqual(options.endpoints[2]);
            expect(result.errors[0].kind).toEqual('http');
          },
          complete: () => done()
        });
      }));

    describe('WHEN noProxy option is used', () => {
      beforeEach(() => {
        server.resetHandlers(...successHandlers);
      });

      it('THEN a proxy agent is created for all matching endpoints', () =>
        new Promise<void>(done => {
          const proxyEndpoint = 'https://proxy.endpoint.com';
          const source$: Observable<Page[]> = Source.create(
            {
              ...options,
              noProxy: /api.endpoint.com\/2/,
              proxyEndpoint
            },
            { schedule }
          );

          source$.pipe(take(1)).subscribe({
            next: () => {
              expect(ProxyAgent).toHaveBeenCalledTimes(2);
            },
            complete: () => done()
          });
        }));
    });

    it('should handle thrown error, two valid results, and one invalid response', () =>
      new Promise<void>(done => {
        server.resetHandlers(
          http.get(options.endpoints[0], () => HttpResponse.json({ name: 'Alice' })),
          http.get(options.endpoints[1], () => HttpResponse.error()), // Simulate network error
          http.get(
            options.endpoints[2],
            () => new HttpResponse(null, { status: 404, statusText: 'Not Found' })
          )
        );

        const source$: Observable<SourceResultSummary<Page>> = createHttpSource(
          { ...options, transformer: toUpperCaseTransformer },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            // Only one successful result
            expect(result.results.length).toEqual(1);
            expect(result.results[0].data).toEqual('ALICE');
            // Two errors: one thrown, one http
            expect(result.errors.length).toEqual(2);
            expect(result.errors[0].kind).toEqual('thrown');
            expect(result.errors[1].kind).toEqual('http');
            const errorUrls = result.errors.map(e => e.url);
            expect(errorUrls).toContain(options.endpoints[1]);
            expect(errorUrls).toContain(options.endpoints[2]);
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN the transformer is passed params', () => {
    const mockTransformer = vi.fn().mockImplementation((...args) => args);
    beforeEach(() => {
      server.resetHandlers(...successHandlers);
    });

    it('should pass transformer options to the transformer', () =>
      new Promise<void>(done => {
        const source$: Observable<SourceResultSummary<Page>> = createHttpSource(
          { ...options, transformer: mockTransformer, transformerOptions: { option: 'an option' } },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: () => {
            expect(mockTransformer).toBeCalledTimes(3);
            expect(mockTransformer.mock.calls[0][0]).toEqual({ name: 'Alice' });
            expect(mockTransformer.mock.calls[0][1]).toEqual(options.prefixDir);
            expect(mockTransformer.mock.calls[0][2]).toEqual(0);
            expect(mockTransformer.mock.calls[0][3]).toEqual({ option: 'an option' });
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN `configuredRequests` option is used', () => {
    beforeEach(() => {
      server.resetHandlers(
        http.get('*', info => {
          return HttpResponse.json({ name: `David ${info.request.url}` });
        })
      );
    });

    it('should merge results from all endpoints into 1 array', () =>
      new Promise<void>(done => {
        const source$: Observable<SourceResultSummary<Page>> = createHttpSource(
          { ...configuredRequestsOptions, transformer: toUpperCaseTransformer },
          {
            schedule
          }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.results.length).toEqual(3);
          },
          complete: () => done()
        });
      }));

    it('should transform the responses using the transform function', () =>
      new Promise<void>(done => {
        const source$: Observable<SourceResultSummary<Page>> = createHttpSource(
          { ...configuredRequestsOptions, transformer: toUpperCaseTransformer },
          {
            schedule
          }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.results[0].data).toEqual('DAVID HTTPS://API.ENDPOINT.COM/1');
            expect(result.results[1].data).toEqual('DAVID HTTPS://API.ENDPOINT.COM/2');
            expect(result.results[2].data).toEqual('DAVID HTTPS://API.ENDPOINT.COM/3');
          },
          complete: () => done()
        });
      }));
  });
});
