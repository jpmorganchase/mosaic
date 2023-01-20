import { Observable, NEVER, of } from 'rxjs';
import { take, concatWith } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import type { Page } from '@jpmorganchase/mosaic-types';

jest.mock('@jpmorganchase/mosaic-from-http-request', () => ({
  ...jest.requireActual('@jpmorganchase/mosaic-from-http-request'),
  __esModule: true,
  fromHttpRequest: jest.fn().mockImplementation((url: string) => of(['response']))
}));

jest.mock('../fromDynamicImport', () => ({
  ...jest.requireActual('../fromDynamicImport'),
  __esModule: true,
  fromDynamicImport: jest.fn().mockImplementation((modulePath: string) => of(mockTransformer))
}));

function mockTransformer(response: any) {
  return response;
}

import Source from '../index.js';

const options = {
  checkIntervalMins: 3,
  initialDelayMs: 100,
  endpoints: ['https://api.endpoint.com'],
  transformResponseToPagesModulePath: '',
  prefixDir: 'prefixDir'
};

/**
 * The purpose of this test is to check that the scheduled updates for an http source work as expected.
 * It is ***NOT*** concerned with what structure the response has or how it is transformed
 *
 * DEV NOTES
 * Due to the nature of the RxJs test scheduler, async code needs to be mocked
 * Specifically, the HTTP Request(s) and the dynamic import of the transformer (both are promises)
 * https://rxjs.dev/guide/testing/marble-testing#rxjs-code-that-consumes-promises-cannot-be-directly-tested
 */
describe('GIVEN an HTTP Source ', () => {
  describe('When subscribed to', () => {
    let testScheduler: TestScheduler;

    beforeEach(() => {
      testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });
    });

    it('it emits a response after `initialDelayMs` and periodically after checkIntervalMins', () => {
      testScheduler.run(({ expectObservable }) => {
        const Source$: Observable<Page[]> = Source.create(options, {}).pipe(
          take(4), // make it actually finite, so it can be rendered
          concatWith(NEVER) // but pretend it's infinite by not completing
        );

        /**
         * Expected timeline
         * after an initial delay, the first fetch is made
         * after waiting the specified check interval another request is made for updates
         *
         * Note, you need to knock 1 ms off the expected delay because the marbles themselves advance time by 1 virtual frame
         * https://rxjs.dev/guide/testing/marble-testing#time-progression-syntax
         */
        const delayMs = options.checkIntervalMins * 60000 - 1;
        const expected = `${options.initialDelayMs}ms a ${delayMs}ms b ${delayMs}ms c ${delayMs}ms d`;

        const expectedValues = options.endpoints.map(() => 'response');

        const values = {
          a: expectedValues, // after initialDelay
          b: expectedValues, // after 1st interval
          c: expectedValues, // after 2nd interval
          d: expectedValues // after 3rd interval
        };

        expectObservable(Source$).toBe(expected, values);
      });
    });
  });
});
