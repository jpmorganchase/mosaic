import path from 'path';
import matter from 'gray-matter';
import type { SafeParseError } from 'zod';
import { activeEnvSchema } from '@jpmorganchase/mosaic-schemas';
import type { SharedConfig } from '@jpmorganchase/mosaic-store';

import type { LoaderPage } from './types/index.js';

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

const loadSharedConfig = async (url: string): Promise<SharedConfig | undefined> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok && response.status !== 404) {
    throw new LoadPageError({
      message: `Could not load shared config : ${url} ${response.status}/${response.statusText}`,
      statusCode: 404
    });
  }
  if (response.ok) {
    const sharedConfig = await response.json();
    return sharedConfig.config;
  }
  return undefined;
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
    const sharedConfigUrl = path.join(fsRootUrl, path.dirname(route), 'shared-config.json');
    const sharedConfigData = await loadSharedConfig(sharedConfigUrl);
    const source = await response.text();
    const { content, data } = matter(source);
    return { source: content, data: { ...data, sharedConfig: sharedConfigData } };
  }
  throw new LoadPageError({
    message: `Could not load page : ${pageUrl} ${response.status}/${response.statusText}`,
    statusCode: 404
  });
};
