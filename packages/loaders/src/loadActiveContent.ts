import matter from 'gray-matter';
import type { SafeParseError } from 'zod';
import { activeEnvSchema } from '@jpmorganchase/mosaic-schemas';

import { LoadPageError } from './LoadPageError';
import type { LoaderPage } from './types/index.js';

const normalizePageUrl = (url: string): string => (/\/index$/.test(url) ? `${url}.mdx` : url);

type ActiveModeUrlEnv = {
  MOSAIC_ACTIVE_MODE_URL: string;
};

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

export const loadActiveMosaicData = async <T>(url: string): Promise<T> => {
  const fsRootUrl = getFSRootUrl();
  const dataUrl = new URL(url, fsRootUrl);
  const response = await fetch(dataUrl);

  if (!response.ok) {
    // This will activate the closest `error.js` Error Boundary
    throw new Error(`Failed to fetch mosaic data @ ${dataUrl}`);
  }
  return response.json();
};

export const loadActiveContent = async (route: string): Promise<LoaderPage> => {
  const fsRootUrl = getFSRootUrl();
  const pageUrl = normalizePageUrl(`${fsRootUrl}${route}`);
  const response = await fetch(pageUrl);
  if (response.status === 302) {
    const { redirect } = await response.json();
    return loadActiveContent(redirect);
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
