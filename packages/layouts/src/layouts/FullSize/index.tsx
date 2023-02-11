import React from 'react';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutFullSize } from '../../LayoutFullSize';
import type { LayoutProps } from '../../types';

export const FullSize: React.FC<LayoutProps> = ({ children }) => (
  <LayoutBase Header={<AppHeader />}>
    <LayoutFullSize>{children}</LayoutFullSize>
  </LayoutBase>
);
