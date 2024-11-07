import React from 'react';

import { LayoutColumns } from '../../LayoutColumns';
import type { LayoutProps } from '../../types';

export const DetailHighlight: React.FC<LayoutProps> = ({
  SecondarySidebarComponent,
  FooterComponent,
  children
}) => (
  <LayoutColumns
    PrimarySidebar={null}
    SecondarySidebar={SecondarySidebarComponent}
    Footer={FooterComponent}
  >
    {children}
  </LayoutColumns>
);
