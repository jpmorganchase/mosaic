import path from 'path';
import nodeFetch from 'node-fetch';
import matter from 'gray-matter';
import type { SiteState } from '@jpmorganchase/mosaic-store';
import { getSharedConfig } from './getSharedConfig';

type Page = {
  /** Page body content */
  source: string;
  /** Metadata that has been defined by page or added by plugins */
  data: SiteState;
};
type GetPage = (pathname: string) => Promise<Page>;

export const getPage: GetPage = async pathname => {
  const url = path.join('http://localhost:8080', pathname);
  const result = await nodeFetch(url);
  const text = await result.text();
  const { data, content: source } = matter(text);
  const metadata = data as SiteState;
  const sharedConfig = await getSharedConfig(pathname);
  return { data: { ...metadata, sharedConfig }, source };
};
