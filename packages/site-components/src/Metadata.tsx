import React, { ElementType } from 'react';
import { useMeta } from '@jpmorganchase/mosaic-store';
import type { MetaSlice } from '@jpmorganchase/mosaic-store';
import { useSession } from 'next-auth/react';
import Head from 'next/head';

export interface HTMLMeta extends MetaSlice {}

export type MetadataProps = {
  Component?: ElementType;
};

export const Metadata: React.FC<MetadataProps> = ({ Component = Head }) => {
  const { meta } = useMeta();
  const { data: session } = useSession();
  return (
    <Component>
      {meta.title && <title>{meta.title}</title>}
      {meta.description && <meta name="description" content={meta.description} />}
      {session?.user?.image && <link as="image" href={session.user.image} rel="preload" />}
      {meta.breadcrumbs && <meta content={JSON.stringify(meta.breadcrumbs)} name="breadcrumbs" />}
    </Component>
  );
};
