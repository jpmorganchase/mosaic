import React from 'react';
import { useTableOfContents } from '@dpmosaic/site-store';

export const withTableOfContentsAdapter = Component => () => {
  const { tableOfContents } = useTableOfContents();
  return <Component items={tableOfContents} />;
};
