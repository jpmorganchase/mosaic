'use client';

import React from 'react';
import { Button, Icon } from '@jpmorganchase/mosaic-components';

import { Drawer, TriggerElementProps } from '../Drawer';
import { Sidebar } from '../Sidebar';
import { VerticalNavigation, VerticalNavigationProps } from '../VerticalNavigation';
import styles from './styles.css';

const TriggerElement: React.FC<TriggerElementProps> = ({ open, onClick: handleClick }) => (
  <Button className={styles.toggleButton} variant="secondary" onClick={handleClick}>
    {open ? null : <Icon aria-label="show the tab navigation" name="menu" />}
  </Button>
);

export interface AppHeaderDrawerProps extends VerticalNavigationProps {}
export function AppHeaderDrawer(props: AppHeaderDrawerProps) {
  return (
    <Drawer side="left" TriggerElement={TriggerElement}>
      <Sidebar>
        <VerticalNavigation {...props} />
      </Sidebar>
    </Drawer>
  );
}
