import React from 'react';
import classnames from 'classnames';

import styles from './styles.css';
import { Drawer, Sidebar, TriggerElementProps } from '@jpmorganchase/mosaic-site-components';
import { Button, Icon, useBreakpoint } from '@jpmorganchase/mosaic-components';

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
    <div
      className={classnames({
        [styles.fullWidth]: !PrimarySidebar,
        [styles.withSidebar]: PrimarySidebar
      })}
    >
      {showDrawer && PrimarySidebar && (
        <Drawer side="left" TriggerElement={TriggerElement}>
          <Sidebar side="left">{PrimarySidebar}</Sidebar>
        </Drawer>
      )}
      {!showDrawer && PrimarySidebar && <Sidebar side="left">{PrimarySidebar}</Sidebar>}
      <div className={styles.mainWrapper}>
        <div className={styles.columnWrapper}>
          <div className={styles.contentColumn}>
            <main className={styles.contentBody}>{children}</main>
            {Footer && Footer}
          </div>

          {SecondarySidebar && (
            <Sidebar side="right" sticky>
              {SecondarySidebar}
            </Sidebar>
          )}
        </div>
      </div>
    </div>
  );
};
