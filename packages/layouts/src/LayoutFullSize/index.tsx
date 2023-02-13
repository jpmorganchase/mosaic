import React from 'react';
import classnames from 'classnames';

import styles from './styles.css';

export interface LayoutFullSizeProps {
  Footer?: React.ReactElement;
  children: React.ReactNode;
  className?: string;
}

export const LayoutFullSize: React.FC<LayoutFullSizeProps> = ({
  Footer,
  children = null,
  className
}) => (
  <div className={classnames(styles.root, className)}>
    <main>{children}</main>
    {Footer && Footer}
  </div>
);