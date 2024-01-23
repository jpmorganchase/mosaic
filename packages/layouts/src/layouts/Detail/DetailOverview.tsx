import React from 'react';
import { HelpLinks } from '@jpmorganchase/mosaic-components';
import { BackLink } from '@jpmorganchase/mosaic-site-components';

import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const DetailOverview: React.FC<LayoutProps> = ({
  BackLinkProps,
  SidebarProps,
  FooterComponent,
  DocPaginatorComponent,
  PrimarySidebarComponent,
  children
}) => {
  const Sidebar = (
    <>
      {BackLinkProps && (
        <header className={styles.sidebarHeader}>
          <BackLink {...BackLinkProps} />
        </header>
      )}
      {PrimarySidebarComponent}
      {SidebarProps?.helpLinks && <HelpLinks subTitle="Need help?" {...SidebarProps.helpLinks} />}
    </>
  );
  return (
    <LayoutColumns PrimarySidebar={Sidebar} SecondarySidebar={null} Footer={FooterComponent}>
      {children}
      {DocPaginatorComponent}
    </LayoutColumns>
  );
};
