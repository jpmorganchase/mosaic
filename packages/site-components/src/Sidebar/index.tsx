import React, { FC, ReactNode } from 'react';
import classnames from 'clsx';
import styles from './styles.css';

export interface SidebarProps {
  children?: ReactNode;
  sticky?: boolean;
}

export const Sidebar: FC<SidebarProps> = ({ children, sticky = false }) => (
  <aside
    className={classnames([
      styles.root,
      {
        [styles.scrollable]: !sticky
      }
    ])}
  >
    {!sticky ? (
      children
    ) : (
      <div
        className={classnames({
          [styles.sticky]: sticky
        })}
      >
        {children}
      </div>
    )}
  </aside>
);
