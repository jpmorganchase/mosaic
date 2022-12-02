import React, { FC, ReactNode } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
import { usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';
import { FullWidth } from './layouts/FullWidth';

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

  let LayoutComponent: FC<LayoutProps> | undefined = layoutComponents?.[layout] as FC<LayoutProps>;
  if (!LayoutComponent) {
    console.error(`Layout ${layout} is not supported, defaulting to FullWidth`);
    LayoutComponent = FullWidth;
  }
  return LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>children</>
  );
};
