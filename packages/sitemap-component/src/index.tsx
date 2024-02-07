import React from 'react';
import { IsomorphicSuspense, ToolbarProvider } from '@jpmorganchase/mosaic-components';

import { SitemapTree } from './SitemapTree';

const LazySitemap = React.lazy(() =>
  import('d3').then(d3 => ({
    default: props => <SitemapTree d3={d3} {...props} />
  }))
);

export const Sitemap = props => (
  <ToolbarProvider>
    <IsomorphicSuspense fallback={<span>Loading Sitemap</span>}>
      <LazySitemap {...props} />
    </IsomorphicSuspense>
  </ToolbarProvider>
);
