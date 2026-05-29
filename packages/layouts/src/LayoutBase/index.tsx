import React from 'react';
import classnames from 'clsx';

import styles from './styles.css';

/**
 * Minimal page chrome wrapper: a top `<header>` slot and a `<main>` body.
 *
 * Loading UI is the responsibility of each route segment via
 * `loading.tsx` / `<Suspense>`, so no spinner overlay is rendered here.
 */
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
    <div className={classnames(styles.root, className)}>
      <header className={styles.header}>{Header}</header>
      <main className={styles.main}>
        <React.Fragment>{children}</React.Fragment>
      </main>
    </div>
  );
};
