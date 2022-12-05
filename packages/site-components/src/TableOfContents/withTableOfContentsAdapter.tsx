import React from 'react';
import { useTableOfContents } from '@jpmorganchase/mosaic-store';
import { TableOfContentsProps } from './TableOfContents';

export const withTableOfContentsAdapter =
  (Component): React.FC<TableOfContentsProps> =>
  ({ items }) => {
    const { tableOfContents } = useTableOfContents();
    return <Component items={items || tableOfContents} />;
  };
