'use client';

/**
 * Bridge between the toolbar's mode toggle and the
 * editor shell.
 *
 * `ModeToggle` lives in the toolbar, far from where the actual
 * markdown / cursor capture happens (inside `EditorInner`'s
 * imperative refs). Rather than thread refs through props from
 * the shell down to the toggle, the shell publishes a
 * `prepareModeFlip(target)` callback through a small context
 * that `ModeToggle` calls synchronously before flipping the URL.
 *
 * The contract: `prepareModeFlip` MUST run before `setMode`
 * (which writes the URL) so the outgoing mode is still mounted
 * when its caret/value are read. ModeToggle enforces this by
 * calling them in that order in a single click handler.
 */

import { createContext, useContext, type ReactNode } from 'react';

import type { EditorMode } from '../useEditorMode';

export interface ModeBridgeSnapshot {
  /** Markdown body at the moment of the flip. */
  markdown: string;
  /** 0-based top-level block index the caret was in. */
  blockIndex: number;
}

export interface ModeBridgeContextValue {
  /**
   * Captures the outgoing mode's value + caret into the shared
   * bridge ref. Must be called BEFORE the URL flip (writing
   * `?mode=`) so the outgoing surface is still mounted.
   *
   * No-op when `target` is the current mode (defensive — the
   * toggle already short-circuits same-mode clicks, but
   * external callers shouldn't have to worry about it).
   */
  prepareModeFlip: (target: EditorMode) => void;
}

const ModeBridgeContext = createContext<ModeBridgeContextValue | null>(null);

export const ModeBridgeProvider = ({
  value,
  children
}: {
  value: ModeBridgeContextValue;
  children: ReactNode;
}) => <ModeBridgeContext.Provider value={value}>{children}</ModeBridgeContext.Provider>;

/**
 * Read the bridge from a descendant of `EditorInner`. Returns
 * `null` (rather than throwing) when the context isn't mounted
 * because the toolbar may also render in places where the
 * bridge doesn't apply (e.g. a future "edit-history" view that
 * reuses the toolbar without the mode toggle being meaningful).
 */
export function useModeBridge(): ModeBridgeContextValue | null {
  return useContext(ModeBridgeContext);
}
