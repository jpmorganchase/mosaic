import { z } from 'zod';

export const s3LoaderProcessEnvSchema = z.object({
  MOSAIC_S3_BUCKET: z.string(),
  MOSAIC_S3_REGION: z.string(),
  MOSAIC_S3_ACCESS_KEY_ID: z.string(),
  MOSAIC_S3_SECRET_ACCESS_KEY: z.string()
});

export type S3LoaderProcessEnv = z.infer<typeof s3LoaderProcessEnvSchema>;
