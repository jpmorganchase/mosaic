'use client';

/**
 * Phase 0c — `ErrorHighlightPlugin` migrated to the Extension API,
 * following the same upstream pattern as `DirtyTrackerExtension`:
 * a standalone `registerErrorHighlight(editor, ...)` helper that
 * both the React plugin and the extension wrapper call, plus a
 * `defineExtension` wrapper for headless consumers.
 *
 * Why this plugin needs a richer interface than `DirtyTracker`
 * -------------------------------------------------------------
 * `DirtyTracker`'s reactive surface is one callback (`markDirty`).
 * Error highlighting needs **two** reactive inputs:
 *
 *   1. The current `error` — when it changes (including changing
 *      to `undefined`), we need to swap which DOM element has the
 *      highlight class.
 *   2. The line map (a ref-backed snapshot built fresh on every
 *      successful compile) — we resolve `error.line` through it
 *      to get a `NodeKey`.
 *
 * Modelling that in the helper API
 * --------------------------------
 * Each input is exposed as a **getter** rather than a value. This
 * matches the existing context plumbing exactly:
 *
 *   - `getError()` returns the current `EditorError | undefined`.
 *     The React plugin's `useEffect` already re-runs when the
 *     `error` context changes, so it re-installs the helper with
 *     a fresh closure each time — same observable behaviour as
 *     before.
 *   - `getLineMap()` returns the current `LineMapEntry | null`.
 *     This is already a ref-backed getter on the React side (see
 *     `LineMapContextValue` in `EditorContext.tsx`); the helper
 *     simply forwards it without forcing a context migration.
 *
 * Why getters rather than values
 * ------------------------------
 * If we took `error` as a plain value parameter, the helper would
 * be called once per error and would close over a stale value if
 * something inside it referenced it asynchronously. With a getter,
 * the helper can always read the *current* value (useful inside
 * the focus handle, which fires on a user click that can land
 * arbitrarily later than the effect mount). For `getLineMap`
 * specifically, the line map is ref-backed for performance (no
 * re-render on every keystroke), and a getter is the only way to
 * read a ref without taking the React layer as a dependency.
 *
 * Why the focus-handle registration lives here, not in a separate fn
 * ------------------------------------------------------------------
 * Registering with `focusErrorRegistry` is part of "the editor has
 * an active error" lifecycle — the registration must be torn down
 * the moment the highlight class comes off, otherwise the banner's
 * "Jump to error" button would scroll the user to a stale block
 * after the error has been resolved. Co-locating both lifecycles
 * (DOM class on/off + focus handle register/unregister) inside the
 * same helper makes the invariant "if there is no class, there is
 * no focus handle either" enforceable by code structure rather than
 * by discipline.
 */

import {
  $getNodeByKey,
  $isElementNode,
  defineExtension,
  type LexicalEditor,
  safeCast
} from 'lexical';
import { effect, namedSignals } from '@lexical/extension';

import { registerFocusErrorHandle } from '../utils/focusErrorRegistry';

import type { EditorError, LineMapEntry } from '../EditorContext';

const ERROR_CLASS = 'mosaic-editor-error-line';

export interface ErrorHighlightInputs {
  /** Current compile error (or `undefined` when clean). */
  getError: () => EditorError | undefined;
  /**
   * Snapshot of the line map paired with the markdown that produced
   * it. May be `null` early in the lifecycle before the first
   * successful compile.
   */
  getLineMap: () => LineMapEntry | null;
}

/**
 * Standalone register fn. Both the React plugin and the extension
 * wrapper call this. Returns an unregister that strips the highlight
 * class (if any) AND removes the focus-handle registration.
 *
 * Semantics match the original `ErrorHighlightPlugin` 1:1:
 *
 *   - No error, no line, no map entry, or no DOM element → nothing
 *     to do. Returns a noop unregister.
 *   - Otherwise: add `ERROR_CLASS` to the resolved element,
 *     publish a focus handle that scrolls + selects-end on the
 *     offending block, and return an unregister that cleans both.
 *
 * The function is intentionally non-reactive — it captures the
 * error / line map exactly once when called. Callers that need to
 * re-run on error changes (the React plugin's `useEffect`, the
 * extension's `effect`) are responsible for tearing down and
 * re-invoking on every change.
 */
export function registerErrorHighlight(
  editor: LexicalEditor,
  { getError, getLineMap }: ErrorHighlightInputs
): () => void {
  const error = getError();
  if (!error || error.line === undefined) return noop;
  const map = getLineMap();
  if (!map) return noop;
  const key = map.lineToKey.get(error.line);
  if (!key) return noop;
  const el = editor.getElementByKey(key);
  if (!el) return noop;

  el.classList.add(ERROR_CLASS);

  // Register the imperative focus action so the banner's "Jump to
  // error" button can scroll, focus, and place the caret on the
  // offending block without taking a direct dep on Lexical APIs.
  const unregisterFocus = registerFocusErrorHandle(() => {
    // `nearest` (not `center`) so we never scroll past the start
    // of the document for the common case where the error is
    // already at the top.
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    // Move the selection inside the offending block before
    // focusing. `editor.focus()` alone restores whatever selection
    // Lexical last remembered — usually the toolbar click, not
    // the error.
    editor.update(
      () => {
        const node = $getNodeByKey(key);
        if (!node) return;
        if ($isElementNode(node)) {
          // `selectEnd` puts the caret after the last inline
          // child — ideal for trailing-bracket / unclosed-tag
          // MDX errors, the most common failure mode.
          node.selectEnd();
        } else {
          // Decorator or unknown — best-effort. We cast through
          // `unknown` (not `any`) so the lint rule stays clean;
          // the runtime check before invocation is the actual
          // safety boundary.
          const maybeSelectable = node as unknown as {
            selectStart?: () => void;
          };
          maybeSelectable.selectStart?.();
        }
      },
      // Defer focusing until after the selection update commits;
      // otherwise focus sees the old selection and restores it.
      { onUpdate: () => editor.focus() }
    );
  });

  return () => {
    el.classList.remove(ERROR_CLASS);
    unregisterFocus();
  };
}

function noop() {
  // Returned when there is no error to highlight; calling it is
  // safe and a no-op, so the React plugin doesn't have to special-
  // case the "nothing to clean up" path.
}

export type ErrorHighlightConfig = ErrorHighlightInputs;

const defaultInputs: ErrorHighlightInputs = {
  getError: () => undefined,
  getLineMap: () => null
};

/**
 * Extension form — same template as upstream `ClearEditorExtension`
 * and our `DirtyTrackerExtension`. The smoke test instantiates
 * this with the default no-op inputs to validate that the
 * `build` / `register` / `effect` plumbing compiles against the
 * pinned Lexical version. The live editor still uses the React
 * plugin (see `../plugins/ErrorHighlightPlugin.tsx`) because the
 * React layer already has the right reactivity for context-sourced
 * inputs.
 */
export const ErrorHighlightExtension = defineExtension({
  name: 'mosaic/error-highlight',
  config: safeCast<ErrorHighlightConfig>(defaultInputs),
  build(_editor, config) {
    return namedSignals(config);
  },
  register(editor, _config, state) {
    const { getError, getLineMap } = state.getOutput();
    return effect(() =>
      registerErrorHighlight(editor, {
        getError: getError.value,
        getLineMap: getLineMap.value
      })
    );
  }
});
