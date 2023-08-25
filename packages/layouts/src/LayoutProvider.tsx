import React, { FC, ReactNode } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
import { usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';

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

export const LayoutProvider: FC<LayoutProviderProps> = ({
  children,
  layoutComponents,
  LayoutProps = {},
  defaultLayout = 'FullWidth'
}) => {
  const { layout: layoutInStore = defaultLayout } = useLayout();
  const { pageState } = usePageState();
  const layout = pageState !== 'VIEW' ? 'EditLayout' : layoutInStore;

  let LayoutComponent: FC<LayoutProps> | undefined = layoutComponents?.[layout] as FC<LayoutProps>;
  if (!LayoutComponent) {
    console.error(`Layout ${layout} is not supported, defaulting to ${defaultLayout}`);
    LayoutComponent = layouts[defaultLayout];
  }
  return LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>children</>
  );
};
