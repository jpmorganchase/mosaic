import type { ReactNode } from 'react';
import type { Breadcrumb, Item as LinkType } from '@jpmorganchase/mosaic-site-components';
import type { FooterProps } from '@jpmorganchase/mosaic-components';

export type ToCItemProp = {
  text: string
}

export type LayoutProps = {
  children?: ReactNode;
  className?: string;
  ToCProps?: {
    items: Array<ToCItemProp>
  };
  SidebarProps?: {
    helpLinks: Pick<FooterProps, 'helpLinks'>;
  };
  NextPrevLinksProps?: {
    next?: LinkType;
    prev?: LinkType;
  };
  BreadcrumbsProps?: { breadcrumbs: Breadcrumb[] };
  BackLinkProps?: { label?: string; link: string };
  FooterProps?: FooterProps;
  layout?: string;
  meta?: {
    data: { [key: string]: any };
  };
  frontmatter?: {
    [key: string]: any;
  };
};
