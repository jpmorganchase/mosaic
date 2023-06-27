import path from 'path';
import { activeEnvSchema } from '@jpmorganchase/mosaic-schemas';
import type { SafeParseError } from 'zod';

import type { LoaderPage, LoaderData, LoaderSource } from './types/index.js';

const normalizePageUrl = (url: string): string => (/\/index$/.test(url) ? `${url}.mdx` : url);

type ActiveEnv = {
  MOSAIC_ACTIVE_MODE_URL: string;
};

export const getActiveConfig = (url: string): Record<string, any> => {
  const env = activeEnvSchema.safeParse(process.env);
  if (!env.success) {
    const error = (env as SafeParseError<ActiveEnv>).error;
    error.issues.forEach(issue => {
      console.error(
        `Missing process.env.${issue.path.join()} environment variable required to load path ${url}`
      );
    });
    throw new Error(`Environment variables missing for loading of ${url} for active mode`);
  }
  return {
    activeModelUrl: env.data.MOSAIC_ACTIVE_MODE_URL
  };
};

const loadData = async (url: string): Promise<LoaderData | undefined> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (response.ok) {
    const sharedConfig = await response.json();
    return { data: { sharedConfig: sharedConfig.config } };
  } else if (response.status !== 404) {
    throw new Error(`Could not load data : ${response.status} - ${response.statusText}`);
  }
  return undefined;
};

export const loadPage = async (url: string): Promise<LoaderSource | undefined> => {
  const response = await fetch(url);
  console.log('....', url);
  if (response.ok) {
    const source = await response.text();
    return { source };
  }
  throw new Error(`Could not load page : ${response.status} - ${response.statusText}`);
};

export function load(route: string): Promise<LoaderPage> {
  const { activeModelUrl } = getActiveConfig(route);
  const page = normalizePageUrl(`${activeModelUrl}${route}`);
  const sharedConfig = path.join(
    'http://localhost:8080',
    path.dirname(route),
    'shared-config.json'
  );
  return Promise.all([loadPage(page), loadData(sharedConfig)]).then(results =>
    results.reduce<LoaderPage>((page, result) => ({ ...page, ...result }), {})
  );
}
