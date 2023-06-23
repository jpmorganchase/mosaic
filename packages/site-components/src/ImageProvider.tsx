import React from 'react';
import { Image } from '@jpmorganchase/mosaic-site-components';
import { ImageProvider as MosaicImageProvider } from '@jpmorganchase/mosaic-components';

export function ImageProvider({ children }) {
  return <MosaicImageProvider value={Image}>{children}</MosaicImageProvider>;
}
