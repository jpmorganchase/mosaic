import React from 'react';
import { Spinner } from '@salt-ds/lab';
import { useRouter } from 'next/router';
import classnames from 'classnames';

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
  const isLoading = useIsLoading();
  return (
    <div className={classnames(styles.root, className)}>
      <header className={styles.header}>{Header}</header>
      <main className={styles.main}>
        <Fade duration={{ enter: 1200, exit: 500 }} in={isLoading}>
          <div className={styles.overlayRoot}>
            <div className={styles.overlayInner} />
            <Spinner size="large" />
          </div>
        </Fade>
        <React.Fragment key={useRouter().asPath.replace(/#.*$/, '')}>{children}</React.Fragment>
      </main>
    </div>
  );
};
