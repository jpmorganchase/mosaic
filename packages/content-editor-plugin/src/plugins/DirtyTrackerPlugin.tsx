'use client';

/**
 * Bridges Lexical's update stream into the editor's save-state FSM.
 *
 * Lexical fires `registerUpdateListener` on every editor update,
 * including non-content events like selection changes and synthetic
 * `history-merge` updates we get during initial state hydration. We
 * only want to mark the document dirty when the user actually changes
 * content — otherwise the save pill would be stuck on "Edited" before
 * a single keystroke.
 *
 * Filters:
 *  - `tags.has('history-merge')` is the canonical signal for "this
 *    update was caused by us loading the document"; skip.
 *  - `dirtyElements.size === 0 && dirtyLeaves.size === 0` is the
 *    selection-only case (pure caret moves); skip.
 *
 * A small `useRef` armed-after-first-update guard prevents the very
 * first update (the initial state load) from also marking dirty, even
 * if it somehow slips past the tag filter.
 */
import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { useSaveState } from '../EditorContext';

export const DirtyTrackerPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { markDirty } = useSaveState();
  const armedRef = useRef(false);

  useEffect(() => {
    return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, tags }) => {
      // Skip the initial hydration update; arm for subsequent ones.
      if (!armedRef.current) {
        armedRef.current = true;
        return;
      }
      if (tags.has('history-merge') || tags.has('historic')) return;
      if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
      markDirty();
    });
  }, [editor, markDirty]);

  return null;
};
