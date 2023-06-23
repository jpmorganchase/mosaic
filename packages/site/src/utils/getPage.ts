import path from 'path';
import nodeFetch from 'node-fetch';
import matter from 'gray-matter';
import type { SiteState } from '@jpmorganchase/mosaic-store';

type Page = {
  /** Page body content */
  source: string;
  /** Metadata that has been defined by page or added by plugins */
  data: SiteState;
};
type GetPage = (pathname: string) => Promise<Page>;

export const getSharedConfig = async route => {
  const routeBase = path.dirname(route);
  const url = path.join('http://localhost:8080', routeBase, 'shared-config.json');
  const res = await nodeFetch(url);
  const resJson = await res.json();
  return resJson.config;
};

export const getPage: GetPage = async pathname => {
  const url = path.join('http://localhost:8080', pathname);
  const result = await nodeFetch(url);
  const text = await result.text();
  const { data, content: source } = matter(text);
  const metadata = data as SiteState;
  const sharedConfig = await getSharedConfig(pathname);
  return { data: { ...metadata, sharedConfig }, source };
};
