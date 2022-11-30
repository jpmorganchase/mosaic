import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Logo } from '@jpmorganchase/uitk-lab';
import { useBreakpoint, Link } from '@jpmorganchase/mosaic-components';
import type { TabsMenu } from '@jpmorganchase/mosaic-components';

import type { HeaderControlsProps } from '../AppHeaderControls';
import { AppHeaderControls } from '../AppHeaderControls';
import { AppHeaderDrawer } from '../AppHeaderDrawer';
import { AppHeaderTabs } from '../AppHeaderTabs';
import styles from './styles.css';

export type AppHeaderProps = {
  HeaderControlsProps?: HeaderControlsProps;
  homeLink?: string;
  logo?: string;
  menu?: TabsMenu;
  title?: string;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const AppHeader: React.FC<AppHeaderProps> = ({
  HeaderControlsProps: AppHeaderControlsProps = {},
  homeLink,
  logo,
  menu = [],
  title
}) => {
  const [condensedNavigation, setCondensedNavigation] = useState(true);
  const breakpoint = useBreakpoint();
  const router = useRouter();

  useIsomorphicLayoutEffect(() => {
    setCondensedNavigation(
      breakpoint === 'mobile' || breakpoint === 'tablet' || breakpoint === 'web'
    );
  }, [breakpoint]);

  return (
    <>
      {condensedNavigation && <AppHeaderDrawer menu={menu} />}
      <div className={styles.root}>
        {homeLink && (
          <Link className={styles.logoContainer} href={homeLink} variant="component">
            {logo && <Logo appTitle={title} src={logo} />}
          </Link>
        )}
        {!condensedNavigation && <AppHeaderTabs key={router.asPath} menu={menu} />}
        <AppHeaderControls {...AppHeaderControlsProps} />
      </div>
    </>
  );
};
