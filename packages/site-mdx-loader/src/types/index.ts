import type { SiteState } from '@jpmorganchase/mosaic-store';

export type LoaderSource = string;
export type LoaderData = Partial<SiteState>;
export type LoaderPage = {
  /** content source */
  source?: LoaderSource;
  /**  meta for content */
  data?: LoaderData;
};
