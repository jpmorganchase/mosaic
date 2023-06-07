import React, { lazy, Suspense } from 'react';

export interface OpenAPIProps {
  /** Additional class name for root class override */
  className?: string;
  /* path to Swagger API instance */
  url?: string;
}

const LazySwagger = lazy(() => import('./SwaggerUi'));

export const OpenAPI: React.FC<React.PropsWithChildren<OpenAPIProps>> = ({ url }) => (
  <Suspense fallback={<span>Loading Swagger component...</span>}>
    <LazySwagger url={url} />
  </Suspense>
);
