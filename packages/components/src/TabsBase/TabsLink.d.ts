import React, { FC } from 'react';
import { TabMenuItemType } from './index';
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
  type: TabMenuItemType.LINK;
}
export interface TabsLinkProps {
  children: React.ReactNode;
  item: TabsLinkItem;
}
export declare const TabsLink: FC<React.PropsWithChildren<TabsLinkProps>>;
