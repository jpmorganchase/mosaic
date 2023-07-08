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

export const getFSRootUrl = (): string => {
  const env = activeEnvSchema.safeParse(process.env);
  if (!env.success) {
    const { error } = env as SafeParseError<ActiveModeUrlEnv>;
    error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load pages`
      );
    });
    throw new Error(`Environment variables missing to load pages`);
  }
  return env.data.MOSAIC_ACTIVE_MODE_URL;
};

export const loadSharedConfig = async (url: string): Promise<SharedConfig | undefined> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not load data : ${response.status} - ${response.statusText}`);
  }
  if (response.ok) {
    const sharedConfig = await response.json();
    return sharedConfig.config;
  }
  return undefined;
};

export const loadPage = async (fsRootUrl: string, route: string): Promise<LoaderPage> => {
  const pageUrl = normalizePageUrl(`${fsRootUrl}${route}`);
  const response = await fetch(pageUrl);
  if (response.status === 302) {
    const { redirect } = await response.json();
    return loadPage(redirect, fsRootUrl);
  }
  if (response.ok) {
    const sharedConfigUrl = path.join(fsRootUrl, path.dirname(route), 'shared-config.json');
    const sharedConfigData = await loadSharedConfig(sharedConfigUrl);
    const source = await response.text();
    const { content, data } = matter(source);
    return { source: content, data: { ...data, sharedConfig: sharedConfigData } };
  }
  throw new Error(`Could not load page : ${route} ${response.status}/${response.statusText}`);
};

export function load(route: string): Promise<LoaderPage> {
  const fsRootUrl = getFSRootUrl();
  return loadPage(fsRootUrl, route);
}
