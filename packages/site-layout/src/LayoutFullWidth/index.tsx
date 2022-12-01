import React from 'react';
import classnames from 'classnames';

import styles from './styles.css';

export const LayoutFullWidth = ({
  Footer,
  children,
  className
}: {
  Footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) => (
  <div className={classnames(styles.root, className)}>
    <main>{children}</main>
    {Footer && Footer}
  </div>
);
