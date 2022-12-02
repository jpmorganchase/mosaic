import React, { useEffect, useState } from 'react';
import classnames from 'classnames';
import { Icon, Button } from '@jpmorganchase/mosaic-components';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';
import { useRouter } from 'next/router';
import type { TabsMenu } from '@jpmorganchase/mosaic-components';
import { LayerLayout } from '@jpmorganchase/uitk-core';
import type { CSSObject } from 'styled-components';

import styles from './styles.css';
import { parseMenu } from './utils';

export type AppHeaderDrawerProps = { menu: TabsMenu };

export function AppHeaderDrawer({ menu }: AppHeaderDrawerProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuItems, setMenuItems] = useState(() => parseMenu(menu));

  const router = useRouter();

  const handleNavigationToggle = () => {
    setDrawerOpen(old => !old);
  };

  const handleNavigationClick = id => {
    if (id) {
      router.push(id);
    }
  };

  useEffect(() => {
    // Close drawer whenever a page loads
    setDrawerOpen(false);
    setMenuItems(parseMenu(menu, router.asPath));
  }, [menu, router]);

  const renderMenu = menu =>
    menu.map(item =>
      item.childNodes ? (
        <SubMenu active={menuItems.current === item.id} label={item.name} key={item.id}>
          {renderMenu(item.childNodes)}
        </SubMenu>
      ) : (
        <MenuItem
          active={menuItems.current === item.id}
          onClick={() => handleNavigationClick(item.id)}
          key={item.id}
        >
          {item.name}
        </MenuItem>
      )
    );

  return (
    <>
      <Button
        className={
          drawerOpen
            ? classnames(styles.toggleButtonActive, styles.toggleButton)
            : classnames(styles.toggleButtonInctive, styles.toggleButton)
        }
        onClick={handleNavigationToggle}
        variant="regular"
      >
        {drawerOpen ? (
          <Icon aria-label="close the main navigation" name="close" />
        ) : (
          <Icon aria-label="show the main navigation" name="menu" />
        )}
      </Button>

      <aside className={styles.sidebarLeftDrawer}>
        <LayerLayout
          className={styles.drawerInner}
          isOpen={drawerOpen}
          disableScrim
          position="left"
        >
          <Sidebar backgroundColor="inherit">
            <Menu
              renderExpandIcon={({ open }) =>
                open ? <Icon name="chevronDown" /> : <Icon name="chevronRight" />
              }
              renderMenuItemStyles={() =>
                ({
                  '.menu-anchor': styles.menuAnchor,
                  '.menu-label': styles.menuLabel
                } as CSSObject)
              }
            >
              {renderMenu(menuItems.items)}
            </Menu>
          </Sidebar>
        </LayerLayout>
      </aside>
    </>
  );
}
