import React from 'react';

import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const DetailContentOnly: React.FC<LayoutProps> = ({
  children,
  BreadcrumbsComponent,
  FooterComponent
}) => (
  <LayoutFullWidth Footer={FooterComponent}>
    <BreadcrumbsComponent />
    {children}
  </LayoutFullWidth>
);
