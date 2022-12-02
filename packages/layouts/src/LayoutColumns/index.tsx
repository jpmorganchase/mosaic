import React from 'react';
import classnames from 'classnames';

import { SidebarLeft, SidebarRight } from '../Sidebars';
import styles from './styles.css';

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
}) => (
  <div
    className={classnames({
      [styles.fullWidth]: !PrimarySidebar,
      [styles.withSidebar]: PrimarySidebar
    })}
  >
    {PrimarySidebar && <SidebarLeft>{PrimarySidebar}</SidebarLeft>}
    <div className={styles.mainWrapper}>
      <div className={styles.columnWrapper}>
        <div className={styles.contentColumn}>
          <main className={styles.contentBody}>{children}</main>
          {Footer && Footer}
        </div>

        {SecondarySidebar && <SidebarRight>{SecondarySidebar}</SidebarRight>}
      </div>
    </div>
  </div>
);
