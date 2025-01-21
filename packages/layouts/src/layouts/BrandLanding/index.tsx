import React from 'react';
import { AppHeader, Hero, BrandFooter } from '@jpmorganchase/mosaic-site-components';
import { SaltProviderNext } from '@salt-ds/core';
import '@salt-ds/theme/css/theme-next.css';

import styles from './styles.css';
import type { LayoutProps } from '../../types';

export const BrandLanding: React.FC<LayoutProps> = ({ FooterProps, children }) => {
  return (
    <SaltProviderNext accent="teal" corner="rounded" actionFont="Amplitude" headingFont="Amplitude">
      <div className={styles.root}>
        <div className={styles.header}>{<AppHeader />}</div>
        <div className={styles.content}>
          <Hero />
          <div className={styles.main}>{children}</div>
          <BrandFooter {...FooterProps} />
        </div>
      </div>
    </SaltProviderNext>
  );
};
