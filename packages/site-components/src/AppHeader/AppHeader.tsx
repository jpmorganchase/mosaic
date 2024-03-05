import React, { useEffect, useLayoutEffect, useState } from 'react';
import { Text } from '@salt-ds/core';
import { Logo, LogoImage } from '@salt-ds/lab';
import { useBreakpoint, Link } from '@jpmorganchase/mosaic-components';
import type { TabsMenu } from '@jpmorganchase/mosaic-components';
import { useRoute } from '@jpmorganchase/mosaic-store';

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

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

export const AppHeader: React.FC<AppHeaderProps> = ({ homeLink, logo, menu = [], title }) => {
  const [showDrawer, setShowDrawer] = useState(false);
  const breakpoint = useBreakpoint();
  const { route } = useRoute();

  useIsomorphicLayoutEffect(() => {
    setShowDrawer(breakpoint === 'mobile' || breakpoint === 'tablet');
  }, [breakpoint]);

  return (
    <>
      {showDrawer && <AppHeaderDrawer menu={createDrawerMenu(menu)} />}
      <div className={styles.root}>
        {homeLink && (
          <Link className={styles.logoContainer} href={homeLink} variant="component">
            {logo && (
              <Logo>
                <LogoImage className={styles.logoImage} src={logo} alt="homepage" />
                <Text>{title}</Text>
              </Logo>
            )}
          </Link>
        )}
        {!showDrawer && <AppHeaderTabs key={route} menu={menu} />}
        <AppHeaderControls />
      </div>
    </>
  );
};
