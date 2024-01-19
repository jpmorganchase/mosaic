import React from 'react';
import { BackLink } from '@jpmorganchase/mosaic-site-components';

import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from '../Detail/styles.css';

export interface NewsletterProps extends LayoutProps {}

export const Newsletter: React.FC<NewsletterProps> = ({
  children,
  BackLinkProps,
  FooterComponent,
  DocPaginatorComponent
}) => {
  const Sidebar = BackLinkProps?.link ? (
    <header className={styles.sidebarHeader}>
      <BackLink {...BackLinkProps} />
    </header>
  ) : null;
  return (
    <LayoutColumns PrimarySidebar={Sidebar} Footer={FooterComponent} SecondarySidebar={null}>
      {children}
      {DocPaginatorComponent}
    </LayoutColumns>
  );
};
