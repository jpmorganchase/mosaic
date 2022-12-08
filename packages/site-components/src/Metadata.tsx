import React, { ElementType } from 'react';
import { useMeta } from '@jpmorganchase/mosaic-store';
import type { MetaSlice } from '@jpmorganchase/mosaic-store';

import { useSession } from './SessionProvider';

export interface HTMLMeta extends MetaSlice {}

export type MetadataProps = {
  Component: ElementType;
};

export const Metadata: React.FC<MetadataProps> = ({ Component = 'head' }) => {
  const { meta } = useMeta();
  const session = useSession();
  return (
    <Component>
      {meta.title && <title>{meta.title}</title>}
      {meta.description && <meta name="description" content={meta.description} />}
      {session?.user?.avatarUrl && <link as="image" href={session.user.avatarUrl} rel="preload" />}
      {meta.breadcrumbs && <meta content={JSON.stringify(meta.breadcrumbs)} name="breadcrumbs" />}
    </Component>
  );
};
