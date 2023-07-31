import { defer, of, throwError } from 'rxjs';
import { catchError, take } from 'rxjs/operators';
import { TestScheduler } from 'rxjs/testing';
import type { Page, SourceSchedule } from '@jpmorganchase/mosaic-types';

import { exponentialBackOffRetryStrategy } from '../exponentialBackOffRetryStrategy.js';

const schedule: SourceSchedule = {
  checkIntervalMins: 3,
  initialDelayMs: 100,
  retryEnabled: true,
  retryDelayMins: 1,
  maxRetries: 3,
  resetOnSuccess: true
};

const source = observables => {
  let count = 0;
  return defer(() => {
    return observables[count++];
  });
};

describe('GIVEN an exponential back off retry strategy ', () => {
  describe('WHEN retries are enabled', () => {
    let testScheduler: TestScheduler;

    beforeEach(() => {
      testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });
    });
    it('THEN it should retry the configured amount of times if the source errors immediately', () => {
      testScheduler.run(({ expectObservable, cold }) => {
        /**
         * Consider the source is completely knackered and fails every time we try to get pages
         */
        const source$ = source([cold('#'), cold('#'), cold('#')]);

        const retryStream$ = source$.pipe(
          exponentialBackOffRetryStrategy(schedule),
          catchError(() => of('error'))
        );

        const values = {
          a: 'error'
        };

        /**
         * For exponential back off with 3 retries and a 1 min initial delay
         * We will be retrying for 1 + 2 + 4 = 7 mins before bailing out
         */
        const expected = `7m (a|) `;
        expectObservable(retryStream$).toBe(expected, values);
      });
    });

    it('THEN it should retry and recover when a source emits again', () => {
      testScheduler.run(({ expectObservable, cold }) => {
        const source$ = source([cold('a--#', { a: 'a' }), cold('(b|)', { b: 'b' })]);

        const retryStream$ = source$.pipe(exponentialBackOffRetryStrategy(schedule));

        const values = {
          a: 'a',
          b: 'b'
        };

        /** 1 error is produced so we are only waiting 1 min */
        const expected = `a-- 1m (b|) `;
        expectObservable(retryStream$).toBe(expected, values);
      });
    });
  });

  describe('WHEN retries are **NOT** enabled', () => {
    let testScheduler: TestScheduler;

    beforeEach(() => {
      testScheduler = new TestScheduler((actual, expected) => {
        expect(actual).toEqual(expected);
      });
    });
    it('THEN it should fail immediately', () => {
      testScheduler.run(({ expectObservable, cold }) => {
        const source$ = source([cold('#')]);

        const retryStream$ = source$.pipe(
          exponentialBackOffRetryStrategy({ ...schedule, retryEnabled: false }),
          catchError(() => of('error'))
        );

        const values = {
          a: 'error'
        };

        const expected = `(a|) `;
        expectObservable(retryStream$).toBe(expected, values);
      });
    });
  });
});
