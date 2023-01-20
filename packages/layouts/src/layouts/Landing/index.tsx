import React from 'react';
import { AppHeader, Footer } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const Landing: React.FC<LayoutProps> = ({ FooterProps, children }) => (
  <LayoutBase Header={<AppHeader />}>
    <LayoutFullWidth Footer={<Footer {...FooterProps} />}>{children}</LayoutFullWidth>
  </LayoutBase>
);
