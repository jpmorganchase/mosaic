import { Observable, of, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import type { Page } from '@jpmorganchase/mosaic-types';

import Source from '../index.js';
import { fromDynamicImport } from '../fromDynamicImport.js';

jest.mock('../fromDynamicImport', () => ({
  ...jest.requireActual('../fromDynamicImport'),
  __esModule: true,
  fromDynamicImport: jest
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

const options = {
  checkIntervalMins: 3,
  initialDelayMs: 100,
  endpoints,
  transformResponseToPagesModulePath: '',
  prefixDir: 'prefixDir'
};

export const successHandlers = [
  rest.get(options.endpoints[0], (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ name: 'Alice' }));
  }),
  rest.get(options.endpoints[1], (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ name: 'Bob' }));
  }),
  rest.get(options.endpoints[2], (_req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ name: 'Eve' }));
  })
];

/**
 * This test validates the responses from an HTTP Source
 * It's main job is to validate that the responses are merged and transformed correctly.
 *
 * It is important that failed requests to an endpoint do not interfere with the results of successful requests
 */
describe('GIVEN an HTTP Source ', () => {
  describe('WHEN a fetch is successful', () => {
    const server = setupServer();
    beforeAll(() => {
      server.use(...successHandlers);
      server.listen({ onUnhandledRequest: 'warn' });
    });
    afterAll(() => {
      server.close();
    });

    it('should merge results from all endpoints into 1 array', done => {
      const source$: Observable<Page[]> = Source.create(options, {});

      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result.length).toEqual(3);
        },
        complete: () => done()
      });
    });

    it('should transform the responses using the transform function', done => {
      const source$: Observable<Page[]> = Source.create(options, {});

      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result[0]).toEqual('ALICE');
          expect(result[1]).toEqual('BOB');
          expect(result[2]).toEqual('EVE');
        },
        complete: () => done()
      });
    });
  });

  describe('WHEN a fetch is **NOT** successful', () => {
    const server = setupServer();
    beforeAll(() => {
      server.use(
        rest.get(options.endpoints[0], (_req, res, ctx) => {
          return res(ctx.status(200), ctx.json({ name: 'Alice' }));
        }),
        rest.get(options.endpoints[1], (_req, res, ctx) => {
          return res(ctx.status(404));
        }),
        rest.get(options.endpoints[2], (_req, res, ctx) => {
          return res(ctx.status(500));
        })
      );
      server.listen({ onUnhandledRequest: 'warn' });
    });
    afterAll(() => {
      server.close();
    });

    it('should merge results from **successful** endpoints into 1 array', done => {
      const source$: Observable<Page[]> = Source.create(options, {});

      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result.length).toEqual(1);
          expect(result[0]).toEqual('ALICE');
        },
        complete: () => done()
      });
    });
  });

  describe('WHEN the transformer has a request config', () => {
    const server = setupServer();
    beforeAll(() => {
      server.use(
        rest.get(options.endpoints[0], (_req, res, ctx) => {
          return res(ctx.status(200), ctx.json({ name: 'Alice' }));
        }),
        rest.get(options.endpoints[1], (_req, res, ctx) => {
          return res(ctx.status(404));
        }),
        rest.get(options.endpoints[2], (_req, res, ctx) => {
          return res(ctx.status(500));
        })
      );
      server.listen({ onUnhandledRequest: 'warn' });
    });
    afterAll(() => {
      server.close();
    });
    it('should merge results from **successful** endpoints into 1 array', done => {
      const source$: Observable<Page[]> = Source.create(options, {});

      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result.length).toEqual(1);
          expect(result[0]).toEqual('ALICE');
        },
        complete: () => done()
      });
    });
  });
});
