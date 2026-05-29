'use client';

import React, { FC, ReactNode, Suspense } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
import { useEditMode } from '@jpmorganchase/mosaic-content-editor-plugin';

import type { LayoutProps } from './types';
import * as layouts from './layouts';

export type LayoutProviderProps = {
  layoutComponents?: {
    [name: string]: React.FC<LayoutProps> | undefined;
  };
  LayoutProps?: LayoutProps;
  children: ReactNode;
  defaultLayout?: string;
};

/**
 * Inner component that does the actual layout selection. Reads
 * `useEditMode` (which wraps `useSearchParams`), so it's wrapped in a
 * `<Suspense>` boundary by the outer `LayoutProvider` to satisfy
 * Next's "useSearchParams must be inside Suspense" prerender check
 * for pages without `?edit=…` on the URL.
 */
const LayoutPicker: FC<LayoutProviderProps> = ({
  children,
  layoutComponents,
  LayoutProps = {},
  defaultLayout = 'FullWidth'
}) => {
  const { layout: layoutInStore = defaultLayout } = useLayout();
  const { isEditing } = useEditMode();
  const layout = isEditing ? 'EditLayout' : layoutInStore;

  let LayoutComponent: FC<LayoutProps> | undefined = layoutComponents?.[layout] as FC<LayoutProps>;
  if (!LayoutComponent) {
    console.error(`Layout ${layout} is not supported, defaulting to ${defaultLayout}`);
    LayoutComponent = layouts[defaultLayout];
  }
  return LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>{children}</>
  );
};

export const LayoutProvider: FC<LayoutProviderProps> = props => (
  <Suspense
    fallback={
      // Render the default layout's children directly during the
      // Suspense fallback so the body isn't blanked out while the
      // search-params hook resolves. The actual layout swap (e.g.
      // into `EditLayout`) happens once `useEditMode` is ready.
      <>{props.children}</>
    }
  >
    <LayoutPicker {...props} />
  </Suspense>
);

