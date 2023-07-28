import { z } from 'zod';

export const sourceScheduleSchema = z.object({
  /**
   * The length of time in minutes before triggering a content refresh
   */
  checkIntervalMins: z.number(),
  /**
   * Startup delay for the source
   */
  initialDelayMs: z.number()
});

export type SourceSchedule = z.infer<typeof sourceScheduleSchema>;
