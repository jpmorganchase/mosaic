import type { SiteState } from '@jpmorganchase/mosaic-store';

export type LoaderSource = { source?: string };
export type LoaderData = { data?: Partial<SiteState> };
export type LoaderPage = LoaderSource & LoaderData;
