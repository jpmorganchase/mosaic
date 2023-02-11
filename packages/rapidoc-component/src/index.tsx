import React, { lazy } from 'react';

import { IsomorphicSuspense } from './IsomorphicSuspense';

const LazySwagger = lazy(() => import('./Rapidoc'));
export const Rapidoc: React.FC<React.PropsWithChildren<any>> = props => (
  <IsomorphicSuspense fallback={<span>Loading Rapidoc component...</span>}>
    <LazySwagger {...props} />
  </IsomorphicSuspense>
);
