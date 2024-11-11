import React from 'react';

import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const FullWidth: React.FC<LayoutProps> = ({ children }) => (
  <LayoutFullWidth>{children}</LayoutFullWidth>
);
