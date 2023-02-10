import React, { FC, ReactNode } from 'react';
import classnames from 'classnames';
import styles from './styles.css';

export interface SidebarProps {
  side: 'left' | 'right';
  children?: ReactNode;
  sticky?: boolean;
}

export const Sidebar: FC<SidebarProps> = ({ children, side = 'left', sticky = false }) => (
  <aside
    className={classnames(styles.root, {
      [styles.left]: side === 'left',
      [styles.right]: side === 'right',
      [styles.sticky]: sticky
    })}
  >
    {children}
  </aside>
);
