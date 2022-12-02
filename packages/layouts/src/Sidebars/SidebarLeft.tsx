import React, { FC, ReactNode } from 'react';

import styles from './styles.css';
import { Drawer } from './Drawer';

export interface SidebarLeftProps {
  children?: ReactNode;
}

export const SidebarLeft: FC<SidebarLeftProps> = ({ children }) => (
  <>
    {children && <Drawer>{children}</Drawer>}
    {!children && <aside className={styles.sidebarLeftEmpty} />}
  </>
);
