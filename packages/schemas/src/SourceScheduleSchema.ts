import { z } from 'zod';

export const sourceScheduleSchema = z.object({
  /**
   * The length of time in minutes before triggering a content refresh
   */
  checkIntervalMins: z.number(),
  /**
   * Startup delay for the source
   */
  initialDelayMs: z.number(),
  /**
   * Enable retries
   * @default true
   */
  retryEnabled: z.boolean().optional().default(true),
  /**
   * interval between retries.  This will rise exponentially on every failure.
   * @default 5 mins
   */
  retryDelayMins: z.number().optional().default(5),
  /**
   *  Maximum number of retry attempts
   * @default 100
   */
  maxRetries: z.number().optional().default(100),
  /**
   * If true, when a source recovers and emits pages it's retry counter is returned to zero
   * See: https://rxjs.dev/api/index/interface/RetryConfig
   * @default true
   */
  resetOnSuccess: z.boolean().optional().default(true)
});

export type SourceSchedule = z.infer<typeof sourceScheduleSchema>;
