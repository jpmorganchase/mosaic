'use client';

import { useContentEditor } from '@jpmorganchase/mosaic-content-editor-plugin';
import { layouts } from '@jpmorganchase/mosaic-layouts';
import { SiteState } from '@jpmorganchase/mosaic-loaders';
import { ReactNode } from 'react';

function getLayoutComponent(layout = 'DetailTechnical') {
  return layouts?.[layout];
}

export interface ViewProps {
  children?: ReactNode;
  layout: Partial<SiteState>['layout'];
}

export function View({ children, layout, ...rest }) {
  const { pageState } = useContentEditor();

  const LayoutComponent = pageState === 'VIEW' ? getLayoutComponent(layout) : layouts?.Edit;

  return <LayoutComponent {...rest}>{children}</LayoutComponent>;
}
