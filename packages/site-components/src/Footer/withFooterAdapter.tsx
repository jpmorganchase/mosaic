import React from 'react';
import { useFooter } from '@dpmosaic/site-store';

export const withFooterAdapter = Component => () => {
  const props = useFooter();
  return <Component {...props} />;
};
