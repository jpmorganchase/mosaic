'use client';

import React from 'react';
import classnames from 'clsx';

import { useFrame } from '../Frame';
import styles from './styles.css';

/**
 * Minimal page chrome wrapper: a top `<header>` slot and a `<main>` body.
 *
 * The header slot is left out when an enclosing `<FrameProvider>` says
 * the frame already renders the header.
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
  const { header: frameRendersHeader } = useFrame();
  return (
    <div className={classnames(styles.root, className)}>
      {!frameRendersHeader && <header className={styles.header}>{Header}</header>}
      <main className={styles.main}>
        <React.Fragment>{children}</React.Fragment>
      </main>
    </div>
  );
};
