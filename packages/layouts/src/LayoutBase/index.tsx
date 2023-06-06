'use client';
import React from 'react';
import classnames from 'clsx';
import { SidebarProvider } from '@jpmorganchase/mosaic-site-components';

import styles from './styles.css';

export const LayoutBase = ({
  Header,
  children,
  className
}: {
  Header?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <SidebarProvider>
      <div className={classnames(styles.root, className)}>
        <header className={styles.header}>{Header}</header>
        <main className={styles.main}>
          <React.Fragment>{children}</React.Fragment>
        </main>
      </div>
    </SidebarProvider>
  );
};
