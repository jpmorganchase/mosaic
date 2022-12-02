import React, { FC, ReactNode } from 'react';

import styles from './styles.css';

export interface SidebarRightProps {
  children?: ReactNode;
}

export const SidebarRight: FC<SidebarRightProps> = ({ children }) => (
  <aside className={styles.sidebarRight}>
    {children && <div className={styles.sidebarStickyArea}>{children}</div>}
  </aside>
);
