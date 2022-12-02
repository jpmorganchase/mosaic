import type { ReactNode } from 'react';
import type { Breadcrumb, LinkType } from '@jpmorganchase/mosaic-site-components';
import { FooterProps } from '@jpmorganchase/mosaic-site-components';

export type ToCItemProp = {
  text: string;
};

export type LayoutProps = {
  children?: ReactNode;
  className?: string;
  ToCProps?: {
    items: Array<ToCItemProp>;
  };
  SidebarProps?: {
    helpLinks: Pick<FooterProps, 'helpLinks'>;
  };
  NextPrevLinksProps?: {
    next?: LinkType;
    prev?: LinkType;
  };
  BreadcrumbsProps?: { breadcrumbs: typeof Breadcrumb[] };
  BackLinkProps?: { label?: string; link: string };
  FooterProps: any;
  layout?: string;
  meta?: {
    data: { [key: string]: any };
  };
  frontmatter?: {
    [key: string]: any;
  };
};
