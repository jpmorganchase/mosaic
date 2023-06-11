'use client';
import React from 'react';
import classnames from 'clsx';
import findLastIndex from 'lodash/findLastIndex';
import { config } from '@jpmorganchase/mosaic-theme';

import { TabsBase, TabsMenu, TabMenuItemType, TabsLinkItem } from '../TabsBase';
import { canUseDOM } from '../canUseDOM';
import { StickyHeader } from '../StickyHeader';
import styles from './styles.css';
import { Link } from '../Link';

const PRIMARY_NAVBAR_HEIGHT = config.appHeader.height;

export interface SecondaryNavbarProps {
  /** Additional class name for root class override */
  className?: string;
  /** Secondary Navbar Items */
  items: TabsMenu;
  /** Url to support resources */
  supportLink: string;
}

const getSelectedTabIndex = (items: TabsMenu, itemPath: string): number =>
  findLastIndex(items, (item): boolean => {
    if (item.type === TabMenuItemType.MENU) {
      return !!item.links.find(link => itemPath.startsWith(link.link));
    }
    return itemPath.startsWith((item as TabsLinkItem).link);
  });

export const SecondaryNavbar: React.FC<React.PropsWithChildren<SecondaryNavbarProps>> = ({
  className,
  items = [],
  supportLink,
  ...props
}) => {
  const locationAsUrl = canUseDOM ? new URL(window.location.href) : null;

  const selectedIndex = locationAsUrl?.pathname
    ? getSelectedTabIndex(items, locationAsUrl.pathname)
    : 0;

  return (
    <StickyHeader
      className={classnames(styles.root, className)}
      offset={PRIMARY_NAVBAR_HEIGHT}
      {...props}
    >
      <TabsBase menu={items} selectedIndex={selectedIndex} />
      <Link className={styles.supportLink} endIcon="none" link={supportLink}>
        Get in touch
      </Link>
    </StickyHeader>
  );
};
