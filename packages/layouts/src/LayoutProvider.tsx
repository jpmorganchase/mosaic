'use client';

import React, { FC, ReactNode, Suspense, useMemo } from 'react';
import { useLayout } from '@jpmorganchase/mosaic-store';
// Deep imports keep the Lexical editor out of every page's bundle: the
// package root re-exports the whole editor.
import { LayoutNamesProvider } from '@jpmorganchase/mosaic-content-editor-plugin/LayoutNamesContext';
import {
  EditModeProvider,
  useEditMode
} from '@jpmorganchase/mosaic-content-editor-plugin/useEditMode';

import type { LayoutProps } from './types';
import * as layouts from './layouts';

export type LayoutProviderProps = {
  layoutComponents?: {
    [name: string]: React.FC<LayoutProps> | undefined;
  };
  LayoutProps?: LayoutProps;
  children: ReactNode;
  defaultLayout?: string;
  /**
   * Whether this request is an edit/create request, as known by the
   * server (`?edit=1` / `?new=1`). When provided, the provider never
   * reads `useSearchParams()`, so statically prerendered pages render
   * their real layout on the server. When omitted, the edit state is
   * derived from the URL inside a Suspense boundary, which makes
   * prerendered pages fall back to client rendering for the layout.
   */
  isEditing?: boolean;
};

const INTERNAL_LAYOUT_NAMES = new Set<string>(['EditLayout']);

/**
 * Resolve the layout component to render, falling back to the default
 * layout for unknown names.
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
 * Renders the page's layout (or `EditLayout` while editing) and makes the
 * edit state available to the chrome through `<EditModeProvider>`.
 */
const LayoutSelection: FC<LayoutProviderProps & { isEditing: boolean }> = ({
  children,
  layoutComponents,
  LayoutProps = {},
  defaultLayout = 'FullWidth',
  isEditing
}) => {
  const { layout: layoutInStore = defaultLayout } = useLayout();
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
  return (
    <EditModeProvider isEditing={isEditing}>
      <LayoutNamesProvider names={authorSelectableNames}>{inner}</LayoutNamesProvider>
    </EditModeProvider>
  );
};

/** Legacy path: derives the edit state from the URL (`useSearchParams`). */
const UrlLayoutPicker: FC<LayoutProviderProps> = props => {
  const { isEditing } = useEditMode();
  return <LayoutSelection {...props} isEditing={isEditing} />;
};

export const LayoutProvider: FC<LayoutProviderProps> = props =>
  typeof props.isEditing === 'boolean' ? (
    <LayoutSelection {...props} isEditing={props.isEditing} />
  ) : (
    // The fallback renders the page's own layout in view mode, so the
    // chrome stays on screen while `useSearchParams` resolves; only the
    // `EditLayout` swap has to wait.
    <Suspense fallback={<LayoutSelection {...props} isEditing={false} />}>
      <UrlLayoutPicker {...props} />
    </Suspense>
  );
