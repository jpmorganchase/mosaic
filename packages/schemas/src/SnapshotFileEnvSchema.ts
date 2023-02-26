import { z } from 'zod';

export const snapshotFileEnvSchema = z.object({
  MOSAIC_SNAPSHOT_DIR: z.string()
});

export type SnapshotFileEnvSchema = z.infer<typeof snapshotFileEnvSchema>;
