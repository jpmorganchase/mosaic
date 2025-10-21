import { FC, forwardRef, Ref } from 'react';
import classnames from 'clsx';

import { TabsButton, TabsButtonItem } from './TabsButton';
import { TabsLink, TabsLinkItem } from './TabsLink';
import { TabsMenuButton, TabsMenuButtonItem } from './TabsMenuButton';
import styles from './styles.css';

export enum TabMenuItemType {
  MENU = 'menu',
  LINK = 'link',
  BUTTON = 'button'
}
export interface TabsBaseProps {
  /** Additional class name for root class override */
  className?: string;
  /** Selected child/tab index */
  selectedIndex?: number;
  /** Menu descriptor */
  menu: TabsMenu;
}

export type TabsMenu = (TabsLinkItem | TabsButtonItem | TabsMenuButtonItem)[];

function TabsItem({ item, active }) {
  const { type } = item;
  if (type === TabMenuItemType.MENU) {
    return <TabsMenuButton item={item} active={active} />;
  }
  if (type === TabMenuItemType.BUTTON) {
    return <TabsButton item={item} active={active} />;
  }
  return <TabsLink item={item} active={active} />;
}

export const TabsBase: FC<TabsBaseProps> = forwardRef(
  ({ className, menu, selectedIndex = -1 }, ref: Ref<HTMLDivElement>) => {
    return (
      // salt-density-medium matches the fixed app header height of 44px
      <div className={classnames(styles.menuItems, 'salt-density-medium', className)} ref={ref}>
        <div className={styles.flexContainer}>
          {menu && menu.length
            ? menu.map((item, itemIndex) => (
                <TabsItem active={itemIndex === selectedIndex} item={item} key={itemIndex} />
              ))
            : null}
        </div>
      </div>
    );
  }
);
