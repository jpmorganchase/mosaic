'use client';

/**
 * `FormattingToolbarSlot` portal plumbing.
 *
 * Why this exists
 * ---------------
 * The chrome toolbar is mounted above `LexicalComposer` so it
 * survives view-mode flips intact. But the toolbar's Lexical-
 * coupled children (undo/redo, bold/italic, insert link/table/
 * image, insert HR) need `useLexicalComposerContext`, which
 * requires the composer mounted upstream.
 *
 * Fix: keep one visual toolbar but render its formatting half via
 * a portal whose target lives inside the chrome row. The portal
 * source (`<WysiwygFormattingTooltrays>`) mounts INSIDE
 * `LexicalComposer` (so its Lexical-coupled children are happy),
 * the portal target (`<FormattingToolbarSlotTarget>`) mounts in
 * the chrome row (so the visual layout is preserved).
 *
 * Provider topology
 * -----------------
 * The portal source and the portal target are SIBLINGS in the
 * React tree (`Toolbar` vs. `WysiwygShell`, both under
 * `EditorInner`). A naive context Provider colocated with the
 * target would not be visible to the source. We therefore split
 * this into three pieces:
 *
 *   - `<FormattingToolbarSlotProvider>` — owns the node state and
 *     wraps a common ancestor of both halves. Mounted by
 *     `EditorInner`.
 *   - `<FormattingToolbarSlotTarget>` — renders the actual `<div>`
 *     and publishes its DOM node into the provider via a
 *     setter. Mounted by `Toolbar`.
 *   - `<FormattingToolbarPortal>` — reads the published node and
 *     `createPortal`s its children into it. Mounted by
 *     `WysiwygFormattingTooltrays` inside `LexicalComposer`.
 *
 * In source mode the composer isn't mounted, the portal source
 * never renders, and the slot stays empty — which is the right
 * UX because formatting buttons can't operate on a raw textarea.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { createPortal } from 'react-dom';
import classnames from 'clsx';

import slotStyles from './FormattingToolbarSlot.css';

interface SlotContextValue {
  node: HTMLElement | null;
  setNode: (node: HTMLElement | null) => void;
}

const SlotContext = createContext<SlotContextValue>({
  node: null,
  setNode: () => {}
});

interface FormattingToolbarSlotProviderProps {
  children: ReactNode;
}

/**
 * Owns the slot DOM-node state. Mount once at a level that is a
 * common ancestor of both the target (`<FormattingToolbarSlotTarget>`,
 * inside `Toolbar`) and the portal source
 * (`<FormattingToolbarPortal>`, inside `WysiwygShell`).
 */
export const FormattingToolbarSlotProvider = ({ children }: FormattingToolbarSlotProviderProps) => {
  const [node, setNodeState] = useState<HTMLElement | null>(null);
  const setNode = useCallback((next: HTMLElement | null) => {
    setNodeState(prev => (prev === next ? prev : next));
  }, []);
  const value = useMemo<SlotContextValue>(() => ({ node, setNode }), [node, setNode]);
  return <SlotContext.Provider value={value}>{children}</SlotContext.Provider>;
};

interface FormattingToolbarSlotTargetProps {
  className?: string;
}

/**
 * Renders the target div that formatting buttons will portal
 * into, and publishes its DOM node into the provider. Mounted
 * inside the chrome toolbar row by `Toolbar.tsx`.
 *
 * The slot div is a flex row so portal'd children become flex
 * items inside it, preserving inter-tooltray spacing. We mirror
 * BaseToolbar's `> *:not(:first-child)` margin rule so spacing
 * between formatting tooltrays matches the spacing between them
 * and the chrome tooltray.
 */
export const FormattingToolbarSlotTarget = ({ className }: FormattingToolbarSlotTargetProps) => {
  const { setNode } = useContext(SlotContext);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    setNode(ref.current);
    return () => setNode(null);
  }, [setNode]);
  return <div ref={ref} className={classnames(className, slotStyles.root)} />;
};

interface FormattingToolbarPortalProps {
  children: ReactNode;
}

/**
 * Portals its children into the nearest enclosing
 * `<FormattingToolbarSlotTarget>`. Renders nothing until the
 * target's mount-effect publishes its DOM node, or if no
 * provider is in the tree at all (defensive).
 */
export const FormattingToolbarPortal = ({ children }: FormattingToolbarPortalProps) => {
  const { node } = useContext(SlotContext);
  if (!node) return null;
  return createPortal(children, node);
};
