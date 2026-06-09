'use client';

import React from 'react';
import { AppHeader } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

/**
 * Layout shown when `?edit=1` is on the URL. `LayoutProvider` swaps
 * this layout in via `useEditMode`. Navigating away drops the
 * `?edit=1` query naturally, so no cleanup effect is needed here.
 */
export const EditLayout: React.FC<LayoutProps> = ({ children }) => (
  <LayoutBase className={styles.base} Header={<AppHeader />}>
    <div id="edit-layout" className={styles.root}>
      {children}
    </div>
  </LayoutBase>
);
