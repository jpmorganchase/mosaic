'use client';

import { FC, Suspense, useEffect, useState } from 'react';
import { Divider, Text } from '@salt-ds/core';
import { useBreakpoint, Link, useImageComponent } from '@jpmorganchase/mosaic-components';
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
  const breakpoint = useBreakpoint();
  const { route } = useRoute();
  const ImageComponent = useImageComponent();
  const showDrawer = breakpoint === 'mobile' || breakpoint === 'tablet';

  // Defer rendering theme-dependent UI (e.g. logo) until after hydration to
  // avoid a flash caused by dark-mode styles relying on theme attributes that
  // aren't available during SSR.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {mounted && showDrawer && <AppHeaderDrawer menu={createDrawerMenu(menu)} />}
      <div className={styles.root}>
        {mounted && homeLink && (
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
        {mounted && !showDrawer && <AppHeaderTabs key={route} menu={menu} />}
        {/*
          `useEditMode` (used by `<AppHeaderControls>` and the
          `EditorControls` button it renders) calls `useSearchParams()`,
          which Next requires to be wrapped in a Suspense boundary so
          that pages without `?edit=…` in their URL can still be
          statically prerendered. The fallback is `null` because the
          controls aren't critical to first paint.
        */}
        <Suspense fallback={null}>
          <AppHeaderControls />
        </Suspense>
      </div>
    </>
  );
};
