import React from 'react';

import { Sidebar } from '@jpmorganchase/mosaic-site-components';

import styles from './styles.css';

export const LayoutColumns = ({
  PrimarySidebar,
  SecondarySidebar,
  Footer,
  children
}: {
  PrimarySidebar?: React.ReactNode;
  SecondarySidebar?: React.ReactNode;
  Footer?: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className={styles.root}>
    <div className={styles.sidebar}>{PrimarySidebar && <Sidebar>{PrimarySidebar}</Sidebar>}</div>
    <main className={styles.main}>
      {children}
      {Footer && Footer}
    </main>
    <div className={styles.toc}>
      {SecondarySidebar ? <Sidebar sticky>{SecondarySidebar}</Sidebar> : null}
    </div>
  </div>
);
