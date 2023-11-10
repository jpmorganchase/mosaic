import React, { FC } from 'react';
import { TabMenuItemType } from './index';
export interface TabsButtonItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** Callback when Tab is selected */
  onSelect: (event: any, string: any) => void;
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: TabMenuItemType.BUTTON;
}
interface TabButtonProps {
  item: TabsButtonItem;
}
export declare const TabsButton: FC<React.PropsWithChildren<TabButtonProps>>;
export {};
