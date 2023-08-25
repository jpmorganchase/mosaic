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
        delay: (error, retryIndex) => {
          const retryDelayMs = schedule.retryDelayMins * 60000;
          // eslint-disable-next-line prefer-exponentiation-operator, no-restricted-properties
          const backOffTime = Math.pow(2, retryIndex - 1) * retryDelayMs;
          const backOffTimeMins = backOffTime / 60000;
          const remainingAttempts = schedule.maxRetries - retryIndex;
          console.warn(`[Mosaic] Source '${schedule.name}' failed. Retrying...`);
          console.log(
            `[Mosaic] Source '${schedule.name}' retry attempt (${retryIndex}/${
              schedule.maxRetries
            }). ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`
          );
          console.log(
            `[Mosaic] Source '${schedule.name}' current retry delay: ${backOffTimeMins} min${
              backOffTimeMins !== 1 ? 's' : ''
            }`
          );

          console.error(`[Mosaic] Source ${error}`);
          return timer(backOffTime);
        },
        resetOnSuccess: schedule.resetOnSuccess
      })
    );
