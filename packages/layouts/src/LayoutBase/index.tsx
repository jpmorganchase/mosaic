import React from 'react';
import classnames from 'clsx';

import styles from './styles.css';

export const LayoutBase = ({
  Header,
  children,
  className
}: {
  Header?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) => (
  <div className={classnames(styles.root, className)}>
    <header className={styles.header}>{Header}</header>
    <main className={styles.main}>{children}</main>
  </div>
);
