'use client';
import React, { ReactNode } from 'react';

let LayoutContext;

export function LayoutConfigProvider({
  children,
  config
}: {
  children?: ReactNode;
  config: unknown;
}) {
  LayoutContext = LayoutContext || React.createContext(config);
  return children;
}

export function useLayoutConfig<T>() {
  if (!LayoutContext) {
    throw new Error('Trying to use `useLayoutConfig` outside of a `LayoutConfigContext`.');
  }

  return React.useContext<T>(LayoutContext);
}
