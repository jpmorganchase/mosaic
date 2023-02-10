import React from 'react';
import { HelpLinks } from '@jpmorganchase/mosaic-components';
import {
  AppHeader,
  DocPaginator,
  BackLink,
  Breadcrumbs,
  Footer,
  TableOfContents,
  PageNavigation
} from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const DetailTechnical: React.FC<LayoutProps> = ({
  BackLinkProps,
  FooterProps,
  SidebarProps,
  children
}) => {
  const Header = <AppHeader />;

  const PrimarySidebar = (
    <>
      {BackLinkProps && (
        <header className={styles.sidebarHeader}>
          <BackLink {...BackLinkProps} />
        </header>
      )}
      <PageNavigation />
      {SidebarProps?.helpLinks && <HelpLinks subTitle="Need help?" {...SidebarProps.helpLinks} />}
    </>
  );

  const SecondarySidebar = <TableOfContents />;

  return (
    <LayoutBase Header={Header}>
      <LayoutColumns
        PrimarySidebar={PrimarySidebar}
        SecondarySidebar={SecondarySidebar}
        Footer={<Footer {...FooterProps} />}
      >
        <Breadcrumbs />
        {children}
        <DocPaginator />
      </LayoutColumns>
    </LayoutBase>
  );
};
