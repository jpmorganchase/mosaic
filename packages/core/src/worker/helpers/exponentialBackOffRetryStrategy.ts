import { Observable, timer } from 'rxjs';
import { retry } from 'rxjs/operators';
import type { Page, SourceSchedule } from '@jpmorganchase/mosaic-types';

export type NamedSourceSchedule = SourceSchedule & {
  /**
   * The generated name of the source
   */
  name: string;
};

export const exponentialBackOffRetryStrategy =
  (schedule: NamedSourceSchedule) => (attempts: Observable<Page[]>) =>
    attempts.pipe(
      retry({
        count: schedule.retryEnabled ? schedule.maxRetries : 0,
        delay: (_error, retryIndex) => {
          const retryDelayMs = schedule.retryDelayMins * 60000;
          // eslint-disable-next-line prefer-exponentiation-operator, no-restricted-properties
          const backOffTime = Math.pow(2, retryIndex - 1) * retryDelayMs;
          const remainingAttempts = schedule.maxRetries - retryIndex;
          console.warn(`[Mosaic] Retrying failed source: ${schedule.name}`);
          console.log(
            `[Mosaic] Attempt (${retryIndex}/${schedule.maxRetries}). ${remainingAttempts} attempt${
              remainingAttempts !== 1 ? 's' : ''
            } remaining`
          );
          console.log(
            `[Mosaic] Retry delay: ${backOffTime / 60000} mins for source: ${schedule.name}`
          );
          return timer(backOffTime);
        },
        resetOnSuccess: schedule.resetOnSuccess
      })
    );
