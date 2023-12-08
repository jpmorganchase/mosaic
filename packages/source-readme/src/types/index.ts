import type { Page } from '@jpmorganchase/mosaic-types';

/** Readme specific metadata */
export type ReadmePageData = {
  title: string;
  description: string;
  link: string;
  repoUrl: string;
  readmeUrl: string;
};

/** Readme page */
export type ReadmePage = {
  description: string;
  data: ReadmePageData;
} & Page;
