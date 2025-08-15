import { describe, expect, it, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { Observable, of, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ProxyAgent } from 'undici';

import type { Page } from '@jpmorganchase/mosaic-types';

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
  fromDynamicImport: vi
    .fn()
    .mockImplementation((modulePath: string) => of({ transformer: toUpperCaseTransformer }))
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
        const source$: Observable<Page[]> = Source.create(options, { schedule });

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.length).toEqual(3);
          },
          complete: () => done()
        });
      }));

    it('should transform the responses using the transform function', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = Source.create(options, { schedule });

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result[0]).toEqual('ALICE');
            expect(result[1]).toEqual('BOB');
            expect(result[2]).toEqual('EVE');
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN a fetch is **NOT** successful', () => {
    beforeEach(() => {
      server.resetHandlers(
        http.get(options.endpoints[0], () => {
          return HttpResponse.json({ name: 'Alice' });
        }),
        http.get(options.endpoints[1], () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get(options.endpoints[2], () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
    });

    it('should merge results from **successful** endpoints into 1 array', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = Source.create(options, { schedule });

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.length).toEqual(1);
            expect(result[0]).toEqual('ALICE');
          },
          complete: () => done()
        });
      }));
  });

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
          next: result => {
            expect(ProxyAgent).toHaveBeenCalledTimes(2);
          },
          complete: () => done()
        });
      }));
  });
});

describe('GIVEN the createHttpSource function ', () => {
  describe('WHEN a fetch is successful', () => {
    beforeEach(() => {
      server.resetHandlers(...successHandlers);
    });

    it('should merge results from all endpoints into 1 array', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = createHttpSource(
          { ...options, transformer: toUpperCaseTransformer },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.length).toEqual(3);
          },
          complete: () => done()
        });
      }));

    it('should transform the responses using the transform function', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = createHttpSource(
          { ...options, transformer: toUpperCaseTransformer },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result[0]).toEqual('ALICE');
            expect(result[1]).toEqual('BOB');
            expect(result[2]).toEqual('EVE');
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN a fetch is **NOT** successful', () => {
    beforeEach(() => {
      server.resetHandlers(
        http.get(options.endpoints[0], () => {
          return HttpResponse.json({ name: 'Alice' });
        }),
        http.get(options.endpoints[1], () => {
          return new HttpResponse(null, { status: 404 });
        }),
        http.get(options.endpoints[2], () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
    });

    it('should merge results from **successful** endpoints into 1 array', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = createHttpSource(
          { ...options, transformer: toUpperCaseTransformer },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.length).toEqual(1);
            expect(result[0]).toEqual('ALICE');
          },
          complete: () => done()
        });
      }));
  });

  describe('WHEN the transformer is passed params', () => {
    const mockTransformer = vi.fn();
    beforeEach(() => {
      server.resetHandlers(...successHandlers);
    });

    it('should pass transformer options to the transformer', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = createHttpSource(
          { ...options, transformer: mockTransformer, transformerOptions: { option: 'an option' } },
          { schedule }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
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
        const source$: Observable<Page[]> = createHttpSource(
          { ...configuredRequestsOptions, transformer: toUpperCaseTransformer },
          {
            schedule
          }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result.length).toEqual(3);
          },
          complete: () => done()
        });
      }));

    it('should transform the responses using the transform function', () =>
      new Promise<void>(done => {
        const source$: Observable<Page[]> = createHttpSource(
          { ...configuredRequestsOptions, transformer: toUpperCaseTransformer },
          {
            schedule
          }
        );

        source$.pipe(take(1)).subscribe({
          next: result => {
            expect(result[0]).toEqual('DAVID HTTPS://API.ENDPOINT.COM/1');
            expect(result[1]).toEqual('DAVID HTTPS://API.ENDPOINT.COM/2');
            expect(result[2]).toEqual('DAVID HTTPS://API.ENDPOINT.COM/3');
          },
          complete: () => done()
        });
      }));
  });
});
