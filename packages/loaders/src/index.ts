import path from 'path';
import type { MosaicMode, SharedConfig } from '@jpmorganchase/mosaic-types';

import type { LoaderPage } from './types/index.js';
import { loadActiveContent, loadActiveMosaicData } from './loadActiveContent';
import { loadSnapshotFileContent, loadSnapshotFileMosaicData } from './loadSnapshotFileContent';

export { LoadPageError } from './LoadPageError';
export * from './types/index.js';

export const loadMosaicData = async <T>(url: string): Promise<T> => {
  const mode: MosaicMode = (process.env.MOSAIC_MODE || 'active') as MosaicMode;

  if (mode === 'snapshot-file') {
    return loadSnapshotFileMosaicData(url);
  }

  return loadActiveMosaicData(url);
};

export const loadSharedConfig = async (route: string): Promise<SharedConfig | undefined> => {
  const sharedConfigUrl = path.posix.join(path.posix.dirname(route), 'shared-config.json');
  const { config } = await loadMosaicData<{ config: SharedConfig }>(sharedConfigUrl);
  return config;
};

export const loadPage = async (route: string): Promise<LoaderPage> => {
  const mode: MosaicMode = (process.env.MOSAIC_MODE || 'active') as MosaicMode;

  if (mode === 'snapshot-file') {
    return loadSnapshotFileContent(route);
  }

  return loadActiveContent(route);
};
