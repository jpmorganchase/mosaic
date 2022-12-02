import React, { FC, ReactNode, useEffect, useLayoutEffect, useState } from 'react';
import { LayerLayout } from '@jpmorganchase/uitk-core';
import { Icon, Button, useBreakpoint } from '@jpmorganchase/mosaic-components';
import styles from './styles.css';

export interface DrawerProps {
  children?: ReactNode;
}

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export const Drawer: FC<DrawerProps> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [useDrawer, setUseDrawer] = useState(false);
  const breakpoint = useBreakpoint();

  const toggleDrawer = () => {
    setOpen(old => !old);
  };

  useIsomorphicLayoutEffect(() => {
    setUseDrawer(breakpoint === 'mobile' || breakpoint === 'tablet');
  }, [breakpoint]);

  useIsomorphicLayoutEffect(() => {
    // Close drawer whenever a page loads
    setOpen(false);
  }, [children]);

  return (
    <>
      {useDrawer && (
        <>
          <LayerLayout
            className={styles.drawerInner}
            aria-label="Overlaid Drawer"
            isOpen={open}
            disableScrim
            position="left"
          >
            <aside className={styles.sidebarLeftDrawer}>{children}</aside>
          </LayerLayout>
          <div className={styles.toggleDrawer}>
            <Button
              className={styles.toggleButton}
              onClick={toggleDrawer}
              variant="regular"
              aria-label="show the secondary navigation"
            >
              {open ? (
                <Icon aria-label="close the main navigation" name="close" />
              ) : (
                <Icon aria-label="show the main navigation" name="menu" />
              )}
            </Button>
          </div>
        </>
      )}
      {!useDrawer && (
        <aside className={styles.sidebarLeft}>
          <div className={styles.sidebarStickyArea}>{children}</div>
        </aside>
      )}
    </>
  );
};
