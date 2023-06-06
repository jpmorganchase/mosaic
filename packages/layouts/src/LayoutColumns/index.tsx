'use client';
import React from 'react';

import { Drawer, Sidebar, TriggerElementProps } from '@jpmorganchase/mosaic-site-components';
import { Button, Icon, useBreakpoint } from '@jpmorganchase/mosaic-components';

import styles from './styles.css';

const TriggerElement: React.FC<TriggerElementProps> = ({ open, onClick: handleClick }) => (
  <Button className={styles.toggleButton} variant="secondary" onClick={handleClick}>
    {open ? (
      <Icon aria-label="close the main navigation" name="close" />
    ) : (
      <Icon aria-label="show the main navigation" name="menu" />
    )}
  </Button>
);

export const LayoutColumns = ({
  PrimarySidebar,
  SecondarySidebar,
  Footer,
  children
}: {
  PrimarySidebar?: React.ReactNode;
  SecondarySidebar?: React.ReactNode;
  Footer?: React.ReactNode;
  children?: React.ReactNode;
}) => {
  const breakpoint = useBreakpoint();
  const showDrawer = breakpoint === 'mobile' || breakpoint == 'tablet';
  return (
    <div className={styles.root}>
      <div className={styles.sidebar}>
        {showDrawer && PrimarySidebar && (
          <Drawer side="left" TriggerElement={TriggerElement}>
            <Sidebar>{PrimarySidebar}</Sidebar>
          </Drawer>
        )}
        {!showDrawer && PrimarySidebar && <Sidebar>{PrimarySidebar}</Sidebar>}
      </div>
      <main className={styles.main}>
        {children}
        {Footer && Footer}
      </main>
      <div className={styles.toc}>
        {SecondarySidebar && !showDrawer ? <Sidebar sticky>{SecondarySidebar}</Sidebar> : null}
      </div>
    </div>
  );
};
