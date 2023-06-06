'use client';

import { Link } from '@jpmorganchase/mosaic-site-components';
import { LinkProvider as MosaicLinkProvider } from '@jpmorganchase/mosaic-components';

export function LinkProvider({ children }) {
  return <MosaicLinkProvider value={Link}>{children}</MosaicLinkProvider>;
}
