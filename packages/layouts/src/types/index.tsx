import type { ReactNode } from 'react';
import type { LinkType } from '@jpmorganchase/mosaic-site-components';
import { FooterProps } from '@jpmorganchase/mosaic-site-components';

export type LayoutProps = {
  AppHeaderComponent: any;
  BreadcrumbsComponent: any;
  FooterComponent: any;
  DocPaginatorComponent: any;
  SecondarySidebarComponent: any;
  children?: ReactNode;
  className?: string;
  ToCProps?: {
    items: any;
  };
  SidebarProps?: Pick<FooterProps, 'helpLinks'>;

  NextPrevLinksProps?: {
    next?: LinkType;
    prev?: LinkType;
  };
  BackLinkProps?: { label?: string; link: string };
  FooterProps?: any;
  layout?: string;
  meta?: {
    data: { [key: string]: any };
  };
  frontmatter?: {
    [key: string]: any;
  };
};
