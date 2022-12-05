import React from 'react';
import { AppHeader, DocPaginator, BackLink, Footer } from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';
import styles from '../Detail/styles.css';

export interface NewsletterProps extends LayoutProps {}

export const Newsletter: React.FC<NewsletterProps> = ({ children, BackLinkProps, FooterProps }) => {
  const Sidebar = BackLinkProps?.link ? (
    <header className={styles.sidebarHeader}>
      <BackLink {...BackLinkProps} />
    </header>
  ) : null;
  return (
    <LayoutBase Header={<AppHeader />}>
      <LayoutColumns
        PrimarySidebar={Sidebar}
        Footer={<Footer {...FooterProps} />}
        SecondarySidebar={null}
      >
        {children}
        <DocPaginator linkSuffix="Post" />
      </LayoutColumns>
    </LayoutBase>
  );
};
