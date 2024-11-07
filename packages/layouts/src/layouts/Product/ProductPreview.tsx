import React from 'react';

import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const ProductPreview: React.FC<LayoutProps> = ({ FooterComponent, children }) => (
  <LayoutFullWidth Footer={FooterComponent}>{children}</LayoutFullWidth>
);
