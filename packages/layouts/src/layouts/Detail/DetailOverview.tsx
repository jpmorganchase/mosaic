import React from 'react';
import { HelpLinks } from '@jpmorganchase/mosaic-components';
import {
  AppHeader,
  BackLink,
  Breadcrumbs,
  DocPaginator,
  Footer,
  VerticalNavigation
} from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const DetailOverview: React.FC<LayoutProps> = ({
  BackLinkProps,
  SidebarProps,
  FooterProps,
  children
}) => {
  const Sidebar = (
    <>
      {BackLinkProps && (
        <header className={styles.sidebarHeader}>
          <BackLink {...BackLinkProps} />
        </header>
      )}
      <VerticalNavigation />
      {SidebarProps?.helpLinks && <HelpLinks subTitle="Need help?" {...SidebarProps.helpLinks} />}
    </>
  );
  return (
    <LayoutBase Header={<AppHeader />}>
      <LayoutColumns
        PrimarySidebar={Sidebar}
        SecondarySidebar={null}
        Footer={<Footer {...FooterProps} />}
      >
        <Breadcrumbs />
        {children}
        <DocPaginator />
      </LayoutColumns>
    </LayoutBase>
  );
};
