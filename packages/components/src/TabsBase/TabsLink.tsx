import React, { FC } from 'react';

import { Link } from '../Link';
import styles from './styles.css';

export interface TabsLinkItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** URL linked by Tab */
  link: string;
  /** Title of Tab */
  title?: string;
  /** Type of Tab */
  type: 'link';
}

export interface TabsLinkProps {
  children: React.ReactNode;
  item: TabsLinkItem;
}

export const TabsLink: FC<React.PropsWithChildren<TabsLinkProps>> = ({ children, item }) => (
  <Link className={styles.menuLink} link={item.link} variant="selectable">
    {item.title || item.label}
    {children}
  </Link>
);
