'use client';
import React from 'react';
import classnames from 'clsx';

import styles from './styles.css';

export interface ComponentExampleProps {
  /** Contents */
  children: React.ReactNode;
  /** Additional class name for overrides */
  className?: string;
}

export const ComponentExample: React.FC<ComponentExampleProps> = ({
  children,
  className,
  ...rest
}: ComponentExampleProps) => (
  <div className={classnames(styles.root, className)} {...rest}>
    <div className={styles.innerContainer}>
      <div className={styles.component}>{children}</div>
    </div>
  </div>
);
