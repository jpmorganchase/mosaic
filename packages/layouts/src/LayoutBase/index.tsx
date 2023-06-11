import React, { Suspense } from 'react';
import { Spinner } from '@salt-ds/core';
import classnames from 'clsx';
import { SidebarProvider } from '@jpmorganchase/mosaic-site-components';

import { Fade } from '../Fade';
import styles from './styles.css';

const Loading = () => (
  <Fade duration={{ enter: 1200, exit: 500 }}>
    <div className={styles.overlayRoot}>
      <div className={styles.overlayInner} />
      <Spinner size="large" />
    </div>
  </Fade>
);

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
          <Suspense fallback={<Loading />}>
            <React.Fragment>{children}</React.Fragment>
          </Suspense>
        </main>
      </div>
    </SidebarProvider>
  );
};
