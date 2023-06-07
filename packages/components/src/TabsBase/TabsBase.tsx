import React, { useRef, useEffect, useState, FC, forwardRef, Ref } from 'react';
import classnames from 'clsx';

import { TabsButton, TabsButtonItem } from './TabsButton';
import { TabsLink, TabsLinkItem } from './TabsLink';
import { TabsMenuButton, TabsMenuButtonItem } from './TabsMenuButton';
import styles from './styles.css';

export type TabMenuItemType = 'menu' | 'link' | 'button';

export interface TabsBaseProps {
  /** Additional class name for root class override */
  className?: string;
  /** Selected child/tab index */
  selectedIndex?: number;
  /** Menu descriptor */
  menu: TabsMenu;
}

export type TabsMenu = (TabsLinkItem | TabsButtonItem | TabsMenuButtonItem)[];

function TabsItem({ children, item }) {
  const { type } = item;
  if (type === 'menu') {
    return <TabsMenuButton item={item}>{children}</TabsMenuButton>;
  }
  if (type === 'button') {
    return <TabsButton item={item}>{children}</TabsButton>;
  }
  return <TabsLink item={item}>{children}</TabsLink>;
}

export const TabsBase: FC<React.PropsWithChildren<TabsBaseProps>> = forwardRef(
  ({ className, menu, selectedIndex = -1 }, ref: Ref<HTMLDivElement>) => {
    const [cursorIndex, setCursorIndex] = useState(() => -1);

    const menuRef = useRef<HTMLDivElement>(null);
    const indicatorRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (selectedIndex >= 0 && menuRef.current && indicatorRef.current) {
        const selectedItem = menuRef.current?.children[selectedIndex] as HTMLElement;
        if (selectedItem) {
          const width = selectedItem.offsetWidth;
          const offset = selectedItem.offsetLeft;
          indicatorRef.current.style.width = `${width}px`;
          indicatorRef.current.style.left = `${offset}px`;
          indicatorRef.current.style.display = 'block';
        }
      }
    }, [selectedIndex]);

    return (
      <div className={classnames(styles.menuItems, className)} ref={ref}>
        <div className={styles.flexContainer} onMouseLeave={() => setCursorIndex(-1)} ref={menuRef}>
          {menu && menu.length
            ? menu.map((item, itemIndex) => (
                <div
                  className={styles.flexContainer}
                  key={`menu_item_${itemIndex}`}
                  onMouseEnter={() => setCursorIndex(itemIndex)}
                >
                  <TabsItem item={item}>
                    <div
                      className={classnames(styles.menuIndicator, {
                        [styles.menuIndicatorHover]: cursorIndex === itemIndex
                      })}
                    />
                  </TabsItem>
                </div>
              ))
            : null}
          <span
            className={classnames(
              styles.menuIndicator,
              styles.menuIndicatorSelected,
              styles.hideOnFirstRender
            )}
            data-selected={selectedIndex >= 0}
            ref={indicatorRef}
          />
        </div>
      </div>
    );
  }
);
