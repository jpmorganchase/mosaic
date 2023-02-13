import React, { lazy } from 'react';

import { IsomorphicSuspense } from './IsomorphicSuspense';

const LazyRapidoc = lazy(() => import('./Rapidoc'));
export const Rapidoc: React.FC<React.PropsWithChildren<any>> = props => (
  <IsomorphicSuspense fallback={<span>Loading Rapidoc component...</span>}>
    <LazyRapidoc {...props} />
  </IsomorphicSuspense>
);
