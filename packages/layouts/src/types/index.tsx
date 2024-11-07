import type { ReactNode } from 'react';
import type { LinkType } from '@jpmorganchase/mosaic-site-components';
import { FooterProps } from '@jpmorganchase/mosaic-site-components';

export type LayoutProps = {
  AppHeaderComponent: ReactNode;
  BreadcrumbsComponent: ReactNode;
  FooterComponent: ReactNode;
  DocPaginatorComponent: ReactNode;
  SecondarySidebarComponent: ReactNode;
  PrimarySidebarComponent: ReactNode;
  children?: ReactNode;
  className?: string;
  SidebarProps?: Pick<FooterProps, 'helpLinks'>;

  NextPrevLinksProps?: {
    next?: LinkType;
    prev?: LinkType;
  };
  BackLinkProps?: { label?: string; link: string };
  layout?: string;
  meta?: {
    data: { [key: string]: any };
  };
  frontmatter?: {
    [key: string]: any;
  };
};
