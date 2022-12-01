import React from 'react';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const AppLayout: React.FC<LayoutProps> = ({ children }) => (
  <LayoutBase Header={<AppHeader />}>
    <div className={styles.root}>{children}</div>
  </LayoutBase>
);
