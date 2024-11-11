import path from 'path';
import fs from 'node:fs/promises';
import matter from 'gray-matter';
import { snapshotFileEnvSchema } from '@jpmorganchase/mosaic-schemas';

import { LoadPageError } from './LoadPageError';
import type { LoaderPage } from './types/index.js';

const normalizePageUrl = (url: string): string => (/\/index$/.test(url) ? `${url}.mdx` : url);

const getFSRootUrl = (): string => {
  const env = snapshotFileEnvSchema.safeParse(process.env);
  if (!env.success) {
    env.error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load pages`
      );
    });
    throw new LoadPageError({
      message: `Environment variables missing to load pages`,
      statusCode: 500
    });
  }
  return env.data.MOSAIC_SNAPSHOT_DIR;
};

export const loadSnapshotFileMosaicData = async <T>(url: string): Promise<T> => {
  const fsRootUrl = getFSRootUrl();
  const filePath = path.join(process.cwd(), fsRootUrl, url);
  try {
    const realPath = await fs.realpath(filePath);

    const source = await fs.readFile(realPath, 'utf-8');
    return JSON.parse(source);
  } catch {
    throw new Error(`Failed to fetch mosaic data @ ${url}`);
  }
};

export const loadSnapshotFileContent = async (route: string): Promise<LoaderPage> => {
  const fsRootUrl = getFSRootUrl();
  const pageUrl = normalizePageUrl(route);
  const filePath = path.join(process.cwd(), fsRootUrl, pageUrl);
  try {
    let localPath = filePath;
    if ((await fs.stat(filePath)).isDirectory()) {
      localPath = path.join(localPath, 'index');
    }
    const realPath = await fs.realpath(localPath);
    const source = await fs.readFile(realPath, 'utf-8');
    const { content, data } = matter(source);
    return { source: content, data };
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw new LoadPageError({
      message: `Could not read local file '${filePath}' for '${route}'`,
      statusCode: 404
    });
  }
};
