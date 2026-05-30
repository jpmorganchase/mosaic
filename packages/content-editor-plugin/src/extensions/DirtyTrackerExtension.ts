'use client';

/**
 * Phase 0c — `DirtyTrackerPlugin` migrated to the Extension API,
 * following upstream Lexical's `ClearEditorExtension` template (see
 * `@lexical/extension/src/ClearEditorExtension.ts`).
 *
 * Why this file exists at all
 * ---------------------------
 * Until Phase 0c, every editor lifecycle that needed to fire on
 * `editor.registerUpdateListener` lived in a React component
 * (`DirtyTrackerPlugin`). That's fine for our live editor (always
 * React-hosted), but it makes the same logic unreachable from any
 * future headless consumer — for example a vitest unit that wants
 * to assert "an `editor.update(...)` that only changes the selection
 * does NOT mark the document dirty" without booting a JSDOM React
 * tree.
 *
 * Pattern (upstream, verbatim)
 * ----------------------------
 * Three pieces, each with a single responsibility:
 *
 *   1. `registerDirtyTracker(editor, markDirty)` — a standalone
 *      function that wires Lexical's update listener to the supplied
 *      `markDirty` callback and returns its own unregister. This is
 *      the unit of logic; the React plugin and the extension wrapper
 *      both call it.
 *
 *   2. `DirtyTrackerExtension` — a `defineExtension` wrapper that
 *      uses `namedSignals(config)` to publish the `markDirty`
 *      callback as a reactive output, and an `effect(...)` inside
 *      `register` that re-installs the listener whenever the
 *      callback identity changes. Matches upstream's
 *      `ClearEditorExtension` line-for-line.
 *
 *   3. The React plugin (`DirtyTrackerPlugin`, in
 *      `../plugins/DirtyTrackerPlugin.tsx`) is a 5-line wrapper:
 *      `useEffect(() => registerDirtyTracker(editor, markDirty), [editor, markDirty])`.
 *      This mirrors upstream's `LexicalClearEditorPlugin.ts`
 *      precisely.
 *
 * Why the live editor uses the React side, not the extension form
 * -----------------------------------------------------------------
 * The reactive input (`markDirty`) is sourced from React context
 * (`useSaveState`). The React adapter's `useEffect` with
 * `[editor, markDirty]` in its dep array gives us the exact same
 * re-register-on-change semantics as the extension's
 * `effect(() => registerDirtyTracker(editor, markDirty.value))`,
 * without paying for the signal layer. Routing the callback
 * through the extension's config would be ceremony with no
 * observable change.
 *
 * The extension form earns its keep the moment a non-React
 * consumer wants the same behaviour (e.g. a future headless
 * vitest unit asserting "an `editor.update` that only changes
 * selection does NOT mark dirty"). At that point the consumer
 * depends on `DirtyTrackerExtension` through
 * `buildEditorFromExtensions` and supplies its own `markDirty`
 * sink via the extension's config.
 *
 * The extension is NOT exercised by `scripts/extensions-smoke.ts`
 * — see that file's top-of-file comment for the constraint
 * (`--experimental-strip-types` can't resolve the transitive
 * extensionless imports we pick up from `../EditorContext` and
 * `../utils/`). It is fully exercised at runtime, every mount,
 * by the React adapter calling `registerDirtyTracker(editor, markDirty)`
 * (which is what the extension's `register` does internally
 * anyway).
 *
 * Filter rationale (preserved verbatim from the React plugin)
 * -----------------------------------------------------------
 * Lexical fires `registerUpdateListener` on every update, including
 * the synthetic `history-merge`/`historic` updates emitted during
 * initial state hydration and undo replay, plus pure selection
 * moves that have no `dirtyElements` / `dirtyLeaves`. Marking the
 * document dirty on any of those would leave the save pill stuck
 * on "Edited" before the user touched a key.
 *
 *   - `tags.has('history-merge' | 'historic')` — Lexical's canonical
 *     signal for "this update was caused by us, not by the user".
 *   - `dirtyElements.size === 0 && dirtyLeaves.size === 0` — the
 *     selection-only case. Lexical fires the update listener for
 *     caret moves too; we don't want those.
 *
 * The `armed` flag inside the closure guards the very first
 * update (the initial state load). It's a closure variable rather
 * than a `useRef` because this helper is React-agnostic — we want
 * the same protection regardless of whether we're called from a
 * React effect or from an extension's `register`.
 */

import { defineExtension, type LexicalEditor, safeCast } from 'lexical';
import { namedSignals } from '@lexical/extension';
import { effect } from '@lexical/extension';

export type MarkDirtyCallback = () => void;

/**
 * Standalone register fn. Returns an unregister to be called on
 * teardown. Both the React plugin and the extension wrapper call
 * this — single source of truth for the filter semantics.
 */
export function registerDirtyTracker(
  editor: LexicalEditor,
  markDirty: MarkDirtyCallback
): () => void {
  // `armed` is closure-scoped so the same guard protects both the
  // React plugin call (effect runs once per mount) and the
  // extension `register` call (runs once per extension lifecycle).
  // If the same editor is re-registered after a teardown, the new
  // closure's `armed=false` correctly suppresses the hydration
  // update of the *new* state, which is the right behaviour.
  let armed = false;
  return editor.registerUpdateListener(({ dirtyElements, dirtyLeaves, tags }) => {
    if (!armed) {
      armed = true;
      return;
    }
    if (tags.has('history-merge') || tags.has('historic')) return;
    if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
    markDirty();
  });
}

export interface DirtyTrackerConfig {
  /**
   * Called whenever a content-changing editor update is observed.
   * Defaults to a no-op so the extension can be instantiated in
   * isolation (e.g. by the smoke test) without supplying a real
   * sink. Live consumers always override this.
   */
  markDirty: MarkDirtyCallback;
}

const defaultMarkDirty: MarkDirtyCallback = () => {
  // Intentionally empty — see config doc above.
};

/**
 * Extension form. Identical shape to upstream's `ClearEditorExtension`:
 *
 *   - `build` turns the config into a `namedSignals` object, so
 *     downstream `register` / dependants can subscribe to changes.
 *   - `register` reads the current `markDirty` from the signal via
 *     `state.getOutput()`, and wraps the helper call in `effect(...)`
 *     so that any future signal write tears down the previous
 *     registration and re-runs it with the new callback. Matters
 *     for hypothetical consumers that swap callbacks at runtime;
 *     the React plugin doesn't write to the signal directly, so
 *     `effect` is effectively a one-shot for that caller, but the
 *     shape stays uniform with upstream.
 */
export const DirtyTrackerExtension = defineExtension({
  name: 'mosaic/dirty-tracker',
  config: safeCast<DirtyTrackerConfig>({ markDirty: defaultMarkDirty }),
  build(_editor, config) {
    return namedSignals(config);
  },
  register(editor, _config, state) {
    const { markDirty } = state.getOutput();
    return effect(() => registerDirtyTracker(editor, markDirty.value));
  }
});
