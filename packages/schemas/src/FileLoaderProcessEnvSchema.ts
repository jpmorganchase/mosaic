import { z } from 'zod';

export const fileLoaderProcessEnvSchema = z.object({
  MOSAIC_SNAPSHOT_DIR: z.string()
});

export type FileLoaderProcessEnv = z.infer<typeof fileLoaderProcessEnvSchema>;
