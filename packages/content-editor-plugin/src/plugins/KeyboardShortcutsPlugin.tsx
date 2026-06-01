'use client';

/**
 * Global keyboard shortcuts.
 *
 * Lexical already binds the obvious text-format shortcuts
 * (⌘B / ⌘I / ⌘U / undo / redo) inside its RichTextPlugin +
 * HistoryPlugin. This plugin only registers the shortcuts that are
 * *editor-app* affordances rather than text-format ones:
 *
 *   - ⌘S / Ctrl+S → open the save dialog. Browsers map this to "Save
 *     Page As…" by default, which is never what the user wants while
 *     editing a doc, so the listener calls `preventDefault` even when
 *     the dialog is already open (a no-op `onSave` call is cheaper
 *     than letting the browser steal the keystroke).
 *
 *   - ⌘K / Ctrl+K → open the Insert Link dialog. Matches the
 *     convention from Slack, Notion, Linear, Google Docs.
 *
 * The handler is attached to `window` rather than the
 * contentEditable. The save shortcut needs to fire even when the
 * focus has wandered out of the editor (e.g. user clicked into the
 * preview pane to scroll), and `keydown` capture on `window` is the
 * smallest hammer that achieves that without monkey-patching focus.
 *
 * Both bindings short-circuit if the active element is in a different
 * editable surface (a Salt `Input` inside an already-open dialog, for
 * instance) so typing `⌘S` into the PR-link search field doesn't
 * reopen the save dialog beneath it. The check uses the standard
 * `tagName + contentEditable` pair — same heuristic used by every
 * other "global shortcut but please not in inputs" handler.
 */

import { useEffect } from 'react';

import { useIsInsertingLink, useShortcutHelp } from '../EditorContext';
import { matchesShortcut, SHORTCUTS } from '../utils/shortcuts';

export interface KeyboardShortcutsPluginProps {
  /** Opens the save / PR dialog. Same callback as `<Toolbar onSave>`. */
  onSave: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // Anything inside the editor root counts as "the editor itself"
  // — covers Lexical's contentEditable in WYSIWYG mode AND the
  // raw-markdown textarea in source mode. We DO want
  // shortcuts to fire there.
  if (target.closest('[data-mosaic-editor-root="true"]')) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  // Other contentEditable surfaces (e.g. a Salt `Input` rendered
  // contentEditable, an embedded form somewhere on the page) are
  // foreign editable surfaces — block.
  return target.isContentEditable;
}

export const KeyboardShortcutsPlugin = ({ onSave }: KeyboardShortcutsPluginProps) => {
  const { setIsInsertingLink } = useIsInsertingLink();
  const { toggleShortcutHelp } = useShortcutHelp();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      // ⌘S — open save dialog. Always preventDefault so the browser
      // doesn't open its "Save Page" dialog on top of ours.
      if (matchesShortcut(event, SHORTCUTS.save)) {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        onSave();
        return;
      }
      // ⌘K — open Insert Link dialog. preventDefault so the browser
      // doesn't focus the URL bar (Firefox / Chrome both bind ⌘K
      // there by default).
      if (matchesShortcut(event, SHORTCUTS.insertLink)) {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        setIsInsertingLink(true);
        return;
      }
      // ⌘/ — toggle the keyboard-shortcut cheatsheet. Toggle (not
      // just open) so the same keystroke also closes it — matches the
      // VS Code / Linear / Slack convention and means a user who hits
      // it by accident can dismiss it without reaching for the mouse.
      // No browser default to fight here, but we still preventDefault
      // for symmetry with the other bindings (cheaper than reasoning
      // about which browsers might bind it in future).
      if (matchesShortcut(event, SHORTCUTS.help)) {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        toggleShortcutHelp();
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSave, setIsInsertingLink, toggleShortcutHelp]);

  return null;
};
