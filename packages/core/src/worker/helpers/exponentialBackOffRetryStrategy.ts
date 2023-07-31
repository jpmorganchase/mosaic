import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import type { Page, SourceSchedule } from '@jpmorganchase/mosaic-types';

export const exponentialBackOffRetryStrategy =
  (schedule: SourceSchedule) => (attempts: Observable<Page[]>) =>
    attempts.pipe(
      retry({
        count: schedule.retryEnabled ? schedule.maxRetries : 0,
        delay: (_error, retryIndex) => {
          const retryDelayMs = schedule.retryDelayMins * 60000;
          // eslint-disable-next-line prefer-exponentiation-operator, no-restricted-properties
          const backOffTime = Math.pow(2, retryIndex - 1) * retryDelayMs;
          const remainingAttempts = schedule.maxRetries - retryIndex;
          console.warn('[Mosaic] Retrying failed source');
          console.log(
            `[Mosaic] Attempt ${retryIndex} of ${
              schedule.maxRetries
            }. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`
          );
          console.log(`[Mosaic] Retry delay: ${backOffTime / 60000} mins`);
          return timer(backOffTime);
        },
        resetOnSuccess: schedule.resetOnSuccess
      })
    );
