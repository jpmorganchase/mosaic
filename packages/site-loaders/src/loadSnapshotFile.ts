import path from 'path';
import fs from 'fs';
import { snapshotFileEnvSchema } from '@jpmorganchase/mosaic-schemas';
import { SafeParseError } from 'zod';

import type { LoaderPage, LoaderData, LoaderSource } from './types/index.js';

const normalizePageUrl = (url: string): string => (/\/index$/.test(url) ? `${url}.mdx` : url);

type SnapshotFileEnv = {
  MOSAIC_SNAPSHOT_DIR: string;
};

export const getSnapshotFileConfig = (url: string): Record<string, any> => {
  const env = snapshotFileEnvSchema.safeParse(process.env);
  if (!env.success) {
    const error = (env as SafeParseError<SnapshotFileEnv>).error;
    error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load path ${url} from file snapshot`
      );
    });
    throw new Error(`Environment variables missing for loading of ${url} for local snapshot`);
  }
  return {
    snapshotDir: env.data.MOSAIC_SNAPSHOT_DIR
  };
};

export const loadFile = async (filePath: string): Promise<string> => {
  let localPath = filePath;
  if ((await fs.promises.stat(filePath)).isDirectory()) {
    localPath = path.posix.join(localPath, 'index');
  }
  const realPath = await fs.promises.realpath(localPath);
  const data = await fs.promises.readFile(realPath, 'utf-8');
  return data.toString();
};

const loadData = async (filePath: string): Promise<LoaderData | undefined> => {
  let fileExists = false;
  try {
    await fs.promises.stat(filePath);
    fileExists = true;
  } catch {}
  if (!fileExists) {
    return undefined;
  }
  try {
    const rawSharedConfig = await loadFile(filePath);
    const sharedConfig = JSON.parse(rawSharedConfig);
    return { data: { sharedConfig: sharedConfig.config } };
  } catch (error: any) {
    throw new Error(`Could not load snapshot data : ${error.message}`);
  }
};

export const loadPage = async (filePath: string): Promise<LoaderSource | undefined> => {
  try {
    const source = await loadFile(filePath);
    return { source };
  } catch (error: any) {
    throw new Error(`Could not load shapshot page : ${error.message}`);
  }
};

export function load(route: string): Promise<LoaderPage> {
  const { snapshotDir } = getSnapshotFileConfig(route);
  const normalizedUrl = normalizePageUrl(route);
  const page = path.posix.join(process.cwd(), snapshotDir, normalizedUrl);
  const snapshotDirname = path.dirname(route);
  const sharedConfig = path.join(process.cwd(), snapshotDir, snapshotDirname, 'shared-config.json');
  return Promise.all([loadPage(page), loadData(sharedConfig)]).then(results =>
    results.reduce<LoaderPage>((page, result) => ({ ...page, ...result }), {})
  );
}
