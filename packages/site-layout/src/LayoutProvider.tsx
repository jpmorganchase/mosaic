import React, { FC, ReactNode } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
import { usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';

import type { LayoutProps } from './types';

export type LayoutProviderProps = {
  layoutComponents?: {
    [name: string]: React.FC<LayoutProps> | undefined;
  };
  LayoutProps?: LayoutProps;
  children: ReactNode;
};

export const LayoutProvider: FC<LayoutProviderProps> = ({
  children,
  layoutComponents = {},
  LayoutProps = {}
}) => {
  const { layout: layoutInStore } = useLayout();
  const { pageState } = usePageState();
  const layout = pageState !== 'VIEW' ? 'EditLayout' : layoutInStore;

  // TODO rename layouts and define a full-screen default
  const LayoutComponent: FC<LayoutProps> | undefined = layout
    ? layoutComponents[layout]
    : layoutComponents.FullWidth;
  return LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>children</>
  );
};
