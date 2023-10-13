import React from 'react';
import { HelpLinks } from '@jpmorganchase/mosaic-components';
import { BackLink } from '@jpmorganchase/mosaic-site-components';

import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from './styles.css';

export const DetailTechnical: React.FC<LayoutProps> = ({
  BackLinkProps,
  FooterComponent,
  DocPaginatorComponent,
  SecondarySidebarComponent,
  PrimarySidebarComponent,
  SidebarProps,
  children
}) => {
  const PrimarySidebar = (
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
    <LayoutColumns
      PrimarySidebar={PrimarySidebar}
      SecondarySidebar={SecondarySidebarComponent}
      Footer={FooterComponent}
    >
      {children}
      {DocPaginatorComponent}
    </LayoutColumns>
  );
};
