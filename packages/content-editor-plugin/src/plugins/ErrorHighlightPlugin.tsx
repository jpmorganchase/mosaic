'use client';

/**
 * Applies a visual error indicator to the Lexical block whose markdown
 * line corresponds to the current compile error's `error.line`.
 *
 * Lookup chain:
 *   error.line  -->  lineMap.lineToKey  -->  NodeKey  -->  editor.getElementByKey(key)  -->  HTMLElement
 *
 * The decoration is applied by adding a CSS class to the element
 * (not by inserting a Lexical node) because:
 *   - The error is purely presentational; we don't want it serialized
 *     back to markdown.
 *   - Adding/removing a class is cheap and doesn't trigger an editor
 *     update (which would otherwise loop us back through onChange).
 *
 * Imperative DOM mutation is acceptable here because we exclusively
 * own the class and tear it off in the effect cleanup; React reconciles
 * the editor surface only on text edits, not on our class changes.
 *
 * Imperative handle for the "Jump to error" banner button is published
 * via the focus-error registry — the banner needs to focus the
 * offending block without needing access to the Lexical editor
 * instance (which lives several context layers deeper than the
 * banner). The handle scrolls the block into view AND moves the
 * caret to the end of it, so the user can immediately start editing
 * to fix the error rather than landing on whatever stale selection
 * Lexical happened to remember.
 */
import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getNodeByKey, $isElementNode } from 'lexical';

import { useErrorMessage, useLineMap } from '../EditorContext';
import { registerFocusErrorHandle } from '../utils/focusErrorRegistry';

const ERROR_CLASS = 'mosaic-editor-error-line';

export const ErrorHighlightPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const { error } = useErrorMessage();
  const { getLineMap } = useLineMap();

  useEffect(() => {
    if (!error || error.line === undefined) return;
    const map = getLineMap();
    if (!map) return;
    const key = map.lineToKey.get(error.line);
    if (!key) return;
    const el = editor.getElementByKey(key);
    if (!el) return;

    el.classList.add(ERROR_CLASS);

    // Register the imperative focus action so the banner's "Jump to
    // error" button can scroll, focus, and place the caret on the
    // offending block without taking a direct dep on Lexical APIs.
    const unregister = registerFocusErrorHandle(() => {
      // Use `nearest` (not `center`) so we never scroll past the
      // start of the document for the common case where the error is
      // already at the top — `center` would push the first paragraph
      // halfway down the viewport, which looks broken.
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      // Move the selection inside the offending block before
      // focusing. `editor.focus()` alone just restores whatever
      // selection Lexical last remembered — usually the spot the
      // user clicked to invoke the toolbar / banner button, which
      // isn't where the error is. Setting the selection explicitly
      // first guarantees the caret lands on the broken block.
      editor.update(
        () => {
          const node = $getNodeByKey(key);
          if (!node) return;
          if ($isElementNode(node)) {
            // selectEnd puts the caret after the last inline child —
            // ideal place to start fixing a trailing-bracket /
            // unclosed-tag style error, which is the most common
            // MDX failure mode.
            node.selectEnd();
          } else {
            // Decorator or unknown — best effort: select the node
            // itself so the user at least knows where to look.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (node as any).selectStart?.();
          }
        },
        // Defer focusing until after the selection update commits,
        // otherwise the focus call sees the old selection state and
        // restores it.
        { onUpdate: () => editor.focus() }
      );
    });

    return () => {
      el.classList.remove(ERROR_CLASS);
      unregister();
    };
  }, [editor, error, getLineMap]);

  return null;
};
