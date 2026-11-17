import React, { ElementType } from 'react';
import { useMeta } from '@jpmorganchase/mosaic-store';
import type { MetaSlice } from '@jpmorganchase/mosaic-store';

import { useMosaicAuth } from './auth';

export interface HTMLMeta extends MetaSlice {}

export type MetadataProps = {
  Component: ElementType;
};

export const Metadata: React.FC<MetadataProps> = ({ Component = 'head' }) => {
  const { meta } = useMeta();
  const { user } = useMosaicAuth();
  return (
    <Component>
      {meta.title && <title>{meta.title}</title>}
      {meta.description && <meta name="description" content={meta.description} />}
      {meta.lastModified && <meta name="lastModified" content={meta.lastModified} />}
      {user?.image && <link as="image" href={user.image} rel="preload" />}
      {Array.isArray(meta.breadcrumbs) && meta.breadcrumbs.length > 0 && (
        <meta content={JSON.stringify(meta.breadcrumbs)} name="breadcrumbs" />
      )}
    </Component>
  );
};
