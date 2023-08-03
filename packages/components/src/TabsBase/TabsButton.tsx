import React, { FC } from 'react';

import { TabMenuItemType } from './index';
import styles from './styles.css';

export interface TabsButtonItem {
  /**
   * @deprecated use title
   * Label of Tab */
  label?: string;
  /** Callback when Tab is selected */
  onSelect: (event, string) => void;
  /** Title of Tab */
  title: string;
  /** Type of Tab */
  type: TabMenuItemType.BUTTON;
}

interface TabButtonProps {
  item: TabsButtonItem;
}
export const TabsButton: FC<React.PropsWithChildren<TabButtonProps>> = ({ item }) => (
  <div
    className={styles.menuButton}
    onClick={event => item.onSelect(event, item.title)}
    role="button"
  >
    {item.title || item.label}
  </div>
);
