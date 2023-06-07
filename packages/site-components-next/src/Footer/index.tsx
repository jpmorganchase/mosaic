import * as React from 'react';
import { loadSharedConfig } from '@jpmorganchase/mosaic-loaders';
import { Footer as UI } from '@jpmorganchase/mosaic-site-components';

export async function Footer({ path }: { path: string }) {
  const sharedConfig = await loadSharedConfig(path);
  const footerProps = sharedConfig?.footer;
  return <UI {...footerProps} />;
}
