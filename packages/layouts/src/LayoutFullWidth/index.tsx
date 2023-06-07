import React from 'react';
import classnames from 'clsx';

import styles from './styles.css';

export interface LayoutFullWidthProps {
  Footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const LayoutFullWidth: React.FC<LayoutFullWidthProps> = ({
  Footer,
  children = null,
  className
}) => (
  <div className={classnames(styles.root, className)}>
    <main>{children}</main>
    {Footer && Footer}
  </div>
);
