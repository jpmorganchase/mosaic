import React from 'react';
import { Spinner } from '@salt-ds/core';
import classnames from 'clsx';
import { SidebarProvider } from '@jpmorganchase/mosaic-site-components';

import { useIsLoading } from '../hooks/useIsLoading';
import { Fade } from '../Fade';
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
  // Add a delay before showing loading state, so loading screen doesn't appear if page loads quickly
  const isLoading = useIsLoading({ loadingDelay: 50 });
  return (
    <SidebarProvider>
      <div className={classnames(styles.root, className)}>
        <header className={styles.header}>{Header}</header>
        <main className={styles.main}>
          <Fade style={{ transitionDelay: isLoading ? '1000ms' : '0ms' }} in={isLoading}>
            <div className={styles.overlayRoot}>
              <div className={styles.overlayInner} />
              <Spinner size="large" />
            </div>
          </Fade>
          <React.Fragment>{children}</React.Fragment>
        </main>
      </div>
    </SidebarProvider>
  );
};
