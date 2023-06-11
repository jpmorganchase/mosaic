'use client';
import React, { Children } from 'react';
import classnames from 'clsx';

import styles from './styles.css';

export interface LinksProps {
  /* Link components */
  children: React.ReactElement;
  /* Root classname override */
  className?: string;
}

export const Links: React.FC<LinksProps> = ({ children, className }) => {
  if (Children.count(children) > 7) {
    throw new Error('You can only have a maximum of 8 links in the Links component.');
  }
  return <div className={classnames(styles.root, className)}>{children}</div>;
};
