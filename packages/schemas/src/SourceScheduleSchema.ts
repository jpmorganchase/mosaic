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
   * If true, after a successful retry the retry logic is reset to its initial settings
   * @default true
   */
  resetOnSuccess: z.boolean().optional().default(true)
});

export type SourceSchedule = z.infer<typeof sourceScheduleSchema>;
