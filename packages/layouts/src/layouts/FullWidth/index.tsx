import React from 'react';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutFullWidth } from '../../LayoutFullWidth';
import type { LayoutProps } from '../../types';

export const FullWidth: React.FC<LayoutProps> = ({ children }) => (
  <LayoutBase Header={<AppHeader />}>
    <LayoutFullWidth>{children}</LayoutFullWidth>
  </LayoutBase>
);
