import React from 'react';

import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const DetailContentOnly: React.FC<LayoutProps> = ({ children, FooterComponent }) => (
  <LayoutFullWidth Footer={FooterComponent}>{children}</LayoutFullWidth>
);
