import { z } from 'zod';

export const activeEnvSchema = z.object({
  MOSAIC_ACTIVE_MODE_URL: z.string()
});

export type ActiveEnvSchema = z.infer<typeof activeEnvSchema>;
