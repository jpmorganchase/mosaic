import { FC, ReactNode } from 'react';
import { Text } from '@salt-ds/core';
import { Logo, LogoImage } from '@salt-ds/lab';
import { useBreakpoint, Link } from '@jpmorganchase/mosaic-components';
import type { TabsMenu } from '@jpmorganchase/mosaic-components';

import { AppHeaderControls } from '../AppHeaderControls';
import { AppHeaderDrawer } from '../AppHeaderDrawer';
import { AppHeaderTabs } from '../AppHeaderTabs';
import styles from './styles.css';

export type AppHeaderProps = {
  children?: ReactNode;
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

export const AppHeader: FC<AppHeaderProps> = ({ children, homeLink, logo, menu = [], title }) => {
  const breakpoint = useBreakpoint();
  const showDrawer = breakpoint === 'mobile' || breakpoint === 'tablet';

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
        {!showDrawer && <AppHeaderTabs menu={menu} />}
        <AppHeaderControls>{children}</AppHeaderControls>
      </div>
    </>
  );
};
