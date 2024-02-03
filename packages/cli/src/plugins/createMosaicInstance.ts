import { MosaicConfig } from '@jpmorganchase/mosaic-types';
import MosaicCore from '@jpmorganchase/mosaic-core';

export async function createMosaicInstance(config: MosaicConfig) {
  const mosaic = new MosaicCore(config);
  await mosaic.start();
  return mosaic;
}
