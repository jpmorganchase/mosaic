import React from 'react';
import { useBreadcrumbs } from '@jpmorganchase/mosaic-store';

export const withBreadcrumbsAdapter = Component => () => {
  const { breadcrumbs, enabled } = useBreadcrumbs();
  return <Component breadcrumbs={breadcrumbs} enabled={enabled} />;
};
