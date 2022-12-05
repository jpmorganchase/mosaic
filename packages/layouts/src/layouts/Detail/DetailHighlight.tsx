import React from 'react';
import {
  AppHeader,
  Breadcrumbs,
  Footer,
  TableOfContents
} from '@jpmorganchase/mosaic-site-components';

import { LayoutBase } from '../../LayoutBase';
import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';

export const DetailHighlight: React.FC<LayoutProps> = ({ FooterProps, children }) => (
  <LayoutBase Header={<AppHeader />}>
    <LayoutColumns
      PrimarySidebar={null}
      SecondarySidebar={<TableOfContents />}
      Footer={<Footer {...FooterProps} />}
    >
      <Breadcrumbs />
      {children}
    </LayoutColumns>
  </LayoutBase>
);
