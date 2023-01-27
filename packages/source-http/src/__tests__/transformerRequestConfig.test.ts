import { Observable, of, take } from 'rxjs';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import type { Page } from '@jpmorganchase/mosaic-types';

import Source from '../index.js';

jest.mock('../fromDynamicImport', () => ({
  ...jest.requireActual('../fromDynamicImport'),
  __esModule: true,
  fromDynamicImport: jest.fn().mockImplementation((modulePath: string) =>
    of({
      transformer: toUpperCaseTransformer,
      requestConfig: {
        headers: { 'Content-Type': 'application/json' }
      }
    })
  )
}));

function toUpperCaseTransformer(response) {
  return [response.correctHeaders.toUpperCase()];
}

const endpoints: [string] = ['https://api.endpoint.com/1'];

const options = {
  checkIntervalMins: 3,
  initialDelayMs: 100,
  endpoints,
  transformResponseToPagesModulePath: '',
  prefixDir: 'prefixDir'
};

export const successHandler = rest.get(options.endpoints[0], (req, res, ctx) => {
  if (req.headers.get('content-type') === 'application/json') {
    return res(ctx.status(200), ctx.json({ correctHeaders: 'true' }));
  }
  return res(ctx.status(200), ctx.json({ correctHeaders: 'false' }));
});

/**
 * This test validates that if a transformer also exports a requestConfig
 * Then that requestConfig is used to create the Request instance.
 */
describe('GIVEN an HTTP Source ', () => {
  describe('WHEN the transformer has a request config', () => {
    const server = setupServer();
    beforeAll(() => {
      server.use(successHandler);
      server.listen({ onUnhandledRequest: 'warn' });
    });
    afterAll(() => {
      server.close();
    });
    it('should use the request config', done => {
      const source$: Observable<Page[]> = Source.create(options, {});

      source$.pipe(take(1)).subscribe({
        next: result => {
          expect(result.length).toEqual(1);
          expect(result[0]).toEqual('TRUE');
        },
        complete: () => done()
      });
    });
  });
});
