import React from 'react';
import classnames from 'classnames';

import styles from './styles.css';
import { FooterProps } from '@jpmorganchase/mosaic-site-components';

export interface LayoutFullWidthProps {
  Footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const LayoutFullWidth: React.FC<LayoutFullWidthProps> = ({
  Footer,
  children,
  className
}) => (
  <div className={classnames(styles.root, className)}>
    <main>{children}</main>
    {Footer && Footer}
  </div>
);
