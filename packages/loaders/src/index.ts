import path from 'path';
import matter from 'gray-matter';
import type { SafeParseError } from 'zod';
import { activeEnvSchema } from '@jpmorganchase/mosaic-schemas';
import type { SharedConfig } from '@jpmorganchase/mosaic-store';

import type { LoaderPage } from './types/index.js';

export * from './types/index.js';

const normalizePageUrl = (url: string): string => (/\/index$/.test(url) ? `${url}.mdx` : url);

type ActiveModeUrlEnv = {
  MOSAIC_ACTIVE_MODE_URL: string;
};

export class LoadPageError extends Error {
  statusCode: number;
  constructor({ message, statusCode }: { message: string; statusCode: number }) {
    super(message);
    this.statusCode = statusCode;
  }
}

const getFSRootUrl = (): string => {
  const env = activeEnvSchema.safeParse(process.env);
  if (!env.success) {
    const { error } = env as SafeParseError<ActiveModeUrlEnv>;
    error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load pages`
      );
    });
    throw new LoadPageError({
      message: `Environment variables missing to load pages`,
      statusCode: 500
    });
  }
  return env.data.MOSAIC_ACTIVE_MODE_URL;
};

export const loadMosaicData = async <T>(url: string): Promise<T> => {
  const fsRootUrl = getFSRootUrl();
  const dataUrl = new URL(url, fsRootUrl);
  const response = await fetch(dataUrl);

  if (!response.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error(`Failed to fetch mosaic data @ ${dataUrl}`);
  }
  return response.json();
};

export const loadSharedConfig = async (route: string): Promise<SharedConfig | undefined> => {
  const sharedConfigUrl = path.posix.join(path.posix.dirname(route), 'shared-config.json');
  const { config } = await loadMosaicData<{ config: SharedConfig }>(sharedConfigUrl);
  return config;
};

export const loadPage = async (route: string): Promise<LoaderPage> => {
  const fsRootUrl = getFSRootUrl();
  const pageUrl = normalizePageUrl(`${fsRootUrl}${route}`);
  const response = await fetch(pageUrl);
  if (response.status === 302) {
    const { redirect } = await response.json();
    return loadPage(redirect);
  }
  if (response.ok) {
    const source = await response.text();
    const { content, data } = matter(source);
    return { source: content, data };
  }
  throw new LoadPageError({
    message: `Could not load page : ${pageUrl} ${response.status}/${response.statusText}`,
    statusCode: 404
  });
};
