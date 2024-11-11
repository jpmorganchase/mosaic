import React from 'react';

import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const ProductDiscover: React.FC<LayoutProps> = ({ FooterComponent, children }) => (
  <LayoutFullWidth Footer={FooterComponent}>{children}</LayoutFullWidth>
);
