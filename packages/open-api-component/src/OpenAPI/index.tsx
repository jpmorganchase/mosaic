import React, { lazy } from 'react';

import { IsomorphicSuspense } from '../IsomorphicSuspense';

export interface OpenAPIProps {
  /** Additional class name for root class override */
  className?: string;
  /* path to Swagger API instance */
  url?: string;
}

//TODO: remove ts-ignore and fix type issue
// @ts-ignore
const LazySwagger = lazy(() => import('./SwaggerUi.js'));

export const OpenAPI: React.FC<OpenAPIProps> = ({ className, url }) => (
  <IsomorphicSuspense fallback={<span>Loading Swagger component...</span>}>
    <LazySwagger className={className} url={url} />
  </IsomorphicSuspense>
);
