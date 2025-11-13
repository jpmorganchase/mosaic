import { snapshotS3EnvSchema } from '@jpmorganchase/mosaic-schemas';

export function getSnapshotS3Config(key) {
  const config = snapshotS3EnvSchema.safeParse(process.env);
  if (!config.success) {
    config.error.issues.forEach(issue => {
      console.error(
        `[Mosaic][Middleware] Missing process.env.${issue.path.join()} environment variable required to load S3 bucket ${key}`
      );
    });
    throw new Error(`Environment variables missing for loading of S3 content for key ${key}`);
  }
  return {
    bucket: config.data.MOSAIC_S3_BUCKET,
    region: config.data.MOSAIC_S3_REGION,
    accessKeyId: config.data.MOSAIC_S3_ACCESS_KEY_ID,
    secretAccessKey: config.data.MOSAIC_S3_SECRET_ACCESS_KEY
  };
}
