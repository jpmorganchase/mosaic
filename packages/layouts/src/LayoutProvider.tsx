'use client';

import React, { FC, ReactNode, Suspense, useMemo } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
import { LayoutNamesProvider, useEditMode } from '@jpmorganchase/mosaic-content-editor-plugin';

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

const INTERNAL_LAYOUT_NAMES = new Set<string>(['EditLayout']);

/**
 * Resolve the layout component to render. Pulled out so the
 * Suspense fallback can use the same lookup as the post-suspense
 * render — we want the fallback to mount the FULL chrome (header,
 * sidebars, footer), only the editor-mode swap should wait for
 * `useEditMode`.
 */
function pickLayoutComponent(
  name: string,
  layoutComponents: LayoutProviderProps['layoutComponents'],
  defaultLayout: string
): FC<LayoutProps> | undefined {
  const requested = layoutComponents?.[name] as FC<LayoutProps> | undefined;
  if (requested) return requested;
  if (name !== defaultLayout) {
    console.error(`Layout ${name} is not supported, defaulting to ${defaultLayout}`);
  }
  return (
    (layoutComponents?.[defaultLayout] as FC<LayoutProps> | undefined) ?? layouts[defaultLayout]
  );
}

function getAuthorSelectableNames(
  layoutComponents: LayoutProviderProps['layoutComponents']
): string[] {
  if (!layoutComponents) return [];
  return Object.keys(layoutComponents)
    .filter(name => !INTERNAL_LAYOUT_NAMES.has(name))
    .filter(name => layoutComponents[name] !== undefined)
    .sort();
}

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

  const authorSelectableNames = useMemo(
    () => getAuthorSelectableNames(layoutComponents),
    [layoutComponents]
  );

  const LayoutComponent = pickLayoutComponent(layout, layoutComponents, defaultLayout);
  const inner = LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>{children}</>
  );
  return <LayoutNamesProvider names={authorSelectableNames}>{inner}</LayoutNamesProvider>;
};

/**
 * Suspense fallback for `LayoutPicker`. Renders the default
 * layout's full chrome — header, sidebars, footer — so navigations
 * never expose the bare page body. The only thing that has to wait
 * for `useEditMode` to resolve is the `EditLayout` swap, which is
 * an opt-in author flow and represents a tiny minority of renders.
 *
 * Before this existed, the fallback rendered `<>{children}</>` and
 * every cross-route navigation produced a one-frame flash of
 * unchromed body (visible as a "flash of white" when the body was
 * shorter than the viewport). Mounting the default layout — the
 * SAME component the post-resolve render mounts in the common case
 * — keeps the chrome on screen continuously across navigations.
 */
const LayoutFallback: FC<LayoutProviderProps> = ({
  children,
  layoutComponents,
  LayoutProps = {},
  defaultLayout = 'FullWidth'
}) => {
  const authorSelectableNames = useMemo(
    () => getAuthorSelectableNames(layoutComponents),
    [layoutComponents]
  );
  const LayoutComponent = pickLayoutComponent(defaultLayout, layoutComponents, defaultLayout);
  const inner = LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>{children}</>
  );
  return <LayoutNamesProvider names={authorSelectableNames}>{inner}</LayoutNamesProvider>;
};

export const LayoutProvider: FC<LayoutProviderProps> = props => (
  <Suspense fallback={<LayoutFallback {...props} />}>
    <LayoutPicker {...props} />
  </Suspense>
);
