'use client';

import type { ElementType, ReactNode } from 'react';
import { ImageProvider, LinkProvider } from '@jpmorganchase/mosaic-components';
import { EditModeProvider } from '@jpmorganchase/mosaic-content-editor-plugin/useEditMode';
import { AppHeader } from '@jpmorganchase/mosaic-site-components/AppHeader/index';
import { BaseUrlProvider } from '@jpmorganchase/mosaic-site-components/BaseUrlProvider';
import { Image } from '@jpmorganchase/mosaic-site-components/Image/index';
import { Link } from '@jpmorganchase/mosaic-site-components/Link';
import { StoreProvider, useMosaicStore, type SiteState } from '@jpmorganchase/mosaic-store';
import { PersistentFrame, type NamespaceFrameData } from '@jpmorganchase/mosaic-store/frame';

import { LayoutHeader } from './Frame';
import { LayoutProvider, type LayoutProviderProps } from './LayoutProvider';
import * as mosaicLayouts from './layouts';

export type { NamespaceFrameData } from '@jpmorganchase/mosaic-store/frame';

type Renderers = {
  imageComponent?: ElementType;
  linkComponent?: ElementType;
};

function HostRenderers({
  imageComponent = Image,
  linkComponent = Link,
  children
}: Renderers & { children: ReactNode }) {
  return (
    <BaseUrlProvider>
      <ImageProvider value={imageComponent}>
        <LinkProvider value={linkComponent}>{children}</LinkProvider>
      </ImageProvider>
    </BaseUrlProvider>
  );
}

export type NamespaceFrameProps = Renderers & {
  data: NamespaceFrameData;
  children: ReactNode;
  /** Rendered inside the frame's store, URL, renderer and edit-mode providers. */
  header?: ReactNode;
};

/** Persistent namespace chrome; pages hand over their overrides with FrameSync. */
export function NamespaceFrame({
  data,
  children,
  header = <AppHeader />,
  ...renderers
}: NamespaceFrameProps) {
  return (
    <PersistentFrame
      data={data}
      renderHeader={({ isEditing }) => (
        <HostRenderers {...renderers}>
          <LayoutHeader>
            <EditModeProvider isEditing={isEditing}>{header}</EditModeProvider>
          </LayoutHeader>
        </HostRenderers>
      )}
    >
      {children}
    </PersistentFrame>
  );
}

export type StoreShellProps = Renderers &
  Pick<LayoutProviderProps, 'layoutComponents' | 'LayoutProps' | 'defaultLayout'> & {
    storeProps: Partial<SiteState>;
    isEditing?: boolean;
    children: ReactNode;
  };

/** Per-page store and layout composition, reseeded before paint on refresh. */
export function StoreShell({
  storeProps,
  isEditing = false,
  imageComponent,
  linkComponent,
  layoutComponents = mosaicLayouts,
  children,
  ...layoutProps
}: StoreShellProps) {
  const store = useMosaicStore(storeProps);
  return (
    <StoreProvider value={store}>
      <HostRenderers imageComponent={imageComponent} linkComponent={linkComponent}>
        <LayoutProvider {...layoutProps} layoutComponents={layoutComponents} isEditing={isEditing}>
          {children}
        </LayoutProvider>
      </HostRenderers>
    </StoreProvider>
  );
}
