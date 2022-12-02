import React from 'react';
import { AppHeader, Breadcrumbs, Footer } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const ProductDiscover: React.FC<LayoutProps> = ({ FooterProps, children }) => (
  <LayoutBase Header={<AppHeader />}>
    <LayoutFullWidth Footer={<Footer {...FooterProps} />}>
      <Breadcrumbs />
      {children}
    </LayoutFullWidth>
  </LayoutBase>
);
