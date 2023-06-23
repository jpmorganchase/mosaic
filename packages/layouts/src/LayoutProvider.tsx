import React, { FC, ReactNode } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
import { usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';
import * as defaultLayouts from './layouts';
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
  layoutComponents,
  LayoutProps = {}
}) => {
  const { layout: layoutInStore = 'FullWidth' } = useLayout();
  const { pageState } = usePageState();
  const layout = pageState !== 'VIEW' ? 'EditLayout' : layoutInStore;

  const allLayouts = { ...defaultLayouts, ...layoutComponents };
  let LayoutComponent: FC<LayoutProps> | undefined = allLayouts[layout] as FC<LayoutProps>;
  if (!LayoutComponent) {
    console.error(`Layout ${layout} is not supported, defaulting to FullWidth`);
    LayoutComponent = allLayouts.FullWidth;
  }
  return LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>children</>
  );
};
