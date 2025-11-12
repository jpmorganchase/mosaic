import { snapshotFileEnvSchema } from '@jpmorganchase/mosaic-schemas';

export const getSnapshotFileConfig = url => {
  const env = snapshotFileEnvSchema.safeParse(process.env);
  if (!env.success) {
    env.error.issues.forEach(issue => {
      console.error(
        `[Mosaic][Middleware] Missing process.env.${issue.path.join()} environment variable required to load path ${url} from local snapshot`
      );
    });
    throw new Error(`Environment variables missing for loading of ${url} for local snapshot`);
  }
  return {
    snapshotDir: env.data.MOSAIC_SNAPSHOT_DIR
  };
};
