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

/**
 * Layout names that are NOT author-selectable — they're swapped
 * in by the framework for special states (`?edit=1`, 404) and
 * picking them in the Frontmatter editor's `layout` dropdown
 * would either be a no-op (the framework overrides) or render a
 * broken page. Excluding them at the provider boundary keeps the
 * author UX honest without forcing every consumer to filter.
 */
const INTERNAL_LAYOUT_NAMES = new Set<string>(['EditLayout']);

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

  // Publish the registered author-selectable layout names via
  // `LayoutNamesProvider` so the editor's FrontmatterEditor can
  // render the `layout` field as a typeahead picker. Filter out
  // framework-only names and any `undefined` slots.
  const authorSelectableNames = useMemo(() => {
    if (!layoutComponents) return [];
    return Object.keys(layoutComponents)
      .filter(name => !INTERNAL_LAYOUT_NAMES.has(name))
      .filter(name => layoutComponents[name] !== undefined)
      .sort();
  }, [layoutComponents]);

  let LayoutComponent: FC<LayoutProps> | undefined = layoutComponents?.[layout] as FC<LayoutProps>;
  if (!LayoutComponent) {
    console.error(`Layout ${layout} is not supported, defaulting to ${defaultLayout}`);
    LayoutComponent = layouts[defaultLayout];
  }
  const inner = LayoutComponent ? (
    <LayoutComponent {...LayoutProps}>{children}</LayoutComponent>
  ) : (
    <>{children}</>
  );
  return <LayoutNamesProvider names={authorSelectableNames}>{inner}</LayoutNamesProvider>;
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
