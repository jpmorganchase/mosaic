'use client';

import { FC, useEffect, useState } from 'react';
import { Divider, Text } from '@salt-ds/core';
import { Link, useImageComponent } from '@jpmorganchase/mosaic-components';
import type { TabsMenu } from '@jpmorganchase/mosaic-components';
import { useRoute } from '@jpmorganchase/mosaic-store';
import { breakpoint } from '@jpmorganchase/mosaic-theme';

import { AppHeaderControls } from '../AppHeaderControls';
import { AppHeaderDrawer } from '../AppHeaderDrawer';
import { AppHeaderTabs } from '../AppHeaderTabs';
import styles from './styles.css';

export type AppHeaderProps = {
  homeLink?: string;
  logo?: string;
  menu?: TabsMenu;
  title?: string;
};

const createDrawerMenu = menu =>
  menu.reduce((result, item) => {
    const parsedItem = {
      id: item.link,
      name: item.title,
      data: { link: item.link }
    };
    if (item?.links?.length) {
      const childNodes = createDrawerMenu(item.links);
      return [...result, { ...parsedItem, childNodes }];
    }
    return [...result, parsedItem];
  }, []);

export const AppHeader: FC<AppHeaderProps> = ({ homeLink, logo, menu = [], title }) => {
  const { route } = useRoute();
  const ImageComponent = useImageComponent();
  const [tabsVersion, setTabsVersion] = useState(0);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(`(min-width: ${breakpoint.web}px)`);
    const closeDesktopMenus = () => {
      // Menus render in portals outside the CSS-hidden tabs wrapper. Reset
      // their local state when the desktop trigger disappears.
      if (!query.matches) setTabsVersion(version => version + 1);
    };
    query.addEventListener('change', closeDesktopMenus);
    return () => query.removeEventListener('change', closeDesktopMenus);
  }, []);

  return (
    <>
      <div className={styles.drawer}>
        <AppHeaderDrawer menu={createDrawerMenu(menu)} />
      </div>
      <div className={styles.root}>
        {homeLink && (
          <Link className={styles.logoContainer} href={homeLink} variant="component">
            {logo && (
              <div className={styles.logo}>
                <ImageComponent className={styles.logoImage} src={logo} alt="homepage" />
                {title && (
                  <>
                    <Divider
                      className={styles.logoDivider}
                      variant="tertiary"
                      orientation="vertical"
                    />
                    <Text>{title}</Text>
                  </>
                )}
              </div>
            )}
          </Link>
        )}
        <div className={styles.tabs}>
          <AppHeaderTabs key={`${route}:${tabsVersion}`} menu={menu} />
        </div>
        <AppHeaderControls />
      </div>
    </>
  );
};
