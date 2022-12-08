import React, { lazy } from 'react';

import { IsomorphicSuspense } from '../IsomorphicSuspense';

export interface OpenAPIProps {
  /** Additional class name for root class override */
  className?: string;
  /* path to Swagger API instance */
  url?: string;
}

const LazySwagger = lazy(() => import('./SwaggerUi').then((module: { default }) => module.default));

export const OpenAPI: React.FC<OpenAPIProps> = ({ url }) => (
  <IsomorphicSuspense fallback={<span>Loading Swagger component...</span>}>
    <LazySwagger url={url} />
  </IsomorphicSuspense>
);
