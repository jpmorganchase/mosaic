'use client';

import { Metadata as MosaicMetadata } from '@jpmorganchase/mosaic-site-components';
import Head from 'next/head';

export function Metadata() {
  return <MosaicMetadata Component={Head} />;
}
