'use client';

import { createContext, useContext, type ReactNode } from 'react';

import styles from '../LayoutBase/styles.css';

export type FrameValue = {
  /**
   * `true` when an enclosing frame already renders the app header (for
   * example a persistent App Router layout). `LayoutBase` then leaves
   * its `Header` slot out so the header isn't rendered twice.
   */
  header: boolean;
};

const FrameContext = createContext<FrameValue>({ header: false });
FrameContext.displayName = 'FrameContext';

/**
 * Declares which parts of the page chrome are rendered by an enclosing
 * frame rather than by each layout.
 *
 * A host that keeps the header mounted across navigations renders it
 * once, above the page, inside `<LayoutHeader>`, and wraps the page in
 * `<FrameProvider value={{ header: true }}>`. Layouts keep working
 * unchanged without a provider.
 */
export function FrameProvider({ value, children }: { value: FrameValue; children?: ReactNode }) {
  return <FrameContext.Provider value={value}>{children}</FrameContext.Provider>;
}

export function useFrame(): FrameValue {
  return useContext(FrameContext);
}

/**
 * The sticky app-header bar `LayoutBase` renders, for hosts that render
 * the header outside the layouts (see `FrameProvider`).
 */
export function LayoutHeader({ children }: { children?: ReactNode }) {
  return <header className={styles.header}>{children}</header>;
}
