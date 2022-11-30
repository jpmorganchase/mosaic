import React from 'react';
import { useTableOfContents } from '@jpmorganchase/mosaic-store';

export const withTableOfContentsAdapter = Component => () => {
  const { tableOfContents } = useTableOfContents();
  return <Component items={tableOfContents} />;
};
