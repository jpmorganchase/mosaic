'use client';

/**
 * Extension API authoring layer.
 *
 * Every extension in this directory follows the same pattern as
 * upstream Lexical's `ClearEditorExtension` /
 * `LexicalClearEditorPlugin` split:
 *
 *   1. A standalone `register*(editor, ...inputs)` helper that owns
 *      the Lexical-touching logic (command registration, update
 *      listener, DOM mutation) and returns its own unregister.
 *   2. A `defineExtension(...)` wrapper whose `register` field
 *      calls the helper. Context-bridged extensions also expose
 *      `build` + `namedSignals` so reactive inputs propagate via
 *      `effect(...)` for headless consumers.
 *
 * Both consumption modes share one implementation. React callers
 * import the helper directly; headless callers depend on the
 * extension via `buildEditorFromExtensions`.
 *
 * Two-category split
 * ------------------
 *   - **Command handlers (no reactive config)**:
 *     `HorizontalRuleExtension`, `MarkdownImageExtension`,
 *     `MarkdownLinkExtension`. Helper takes just `editor`.
 *   - **Context-bridged (reactive config)**:
 *     `DirtyTrackerExtension`, `ErrorHighlightExtension`. Helper
 *     takes `editor` plus inputs (`markDirty` callback,
 *     `getError` / `getLineMap` getters).
 *
 * Plugins that explicitly stay React
 * ----------------------------------
 *   - `KeyboardShortcutsPlugin` — registers a `window` keydown
 *     listener and never touches `editor`. An extension wrapper
 *     would be empty ceremony.
 *   - `PreviewPlugin` — React async coordinator (`useTransition`,
 *     memoised `debounce`, context-slice writes, JSX output).
 *     The extension form would be strictly larger and less
 *     idiomatic. Upstream's `LexicalAutoFocusPlugin` is the
 *     precedent for "plain React effect, no extension wrapper".
 *
 * Mount strategy
 * --------------
 * Command-handler extensions are mounted by `Editor.tsx` calling
 * `mergeRegister(registerHorizontalRule(editor), ...)` from a
 * single `useEffect`. Context-bridged extensions mount as React
 * plugins inside the composer (`DirtyTrackerPlugin`,
 * `ErrorHighlightPlugin`) so they can read live React context.
 */

// --- Command-handler extensions ---------------------------------------
//
// Each exports a `register*(editor)` standalone helper (called from
// `Editor.tsx`) and a `*Extension` `defineExtension` wrapper (for
// headless consumers via `buildEditorFromExtensions`).

export { HorizontalRuleExtension, registerHorizontalRule } from './HorizontalRuleExtension';
export {
  MarkdownImageExtension,
  registerMarkdownImage,
  INSERT_MARKDOWN_IMAGE_COMMAND,
  type InsertImagePayload
} from './MarkdownImageExtension';
export {
  MarkdownLinkExtension,
  registerMarkdownLink,
  INSERT_MARKDOWN_LINK_COMMAND,
  type InsertLinkPayload
} from './MarkdownLinkExtension';

// --- Context-bridged extensions ---------------------------------------
//
// Each exports a `register*(editor, inputs)` standalone helper
// (called from the matching `../plugins/*Plugin.tsx` React adapter)
// and a `*Extension` `defineExtension` wrapper (for headless consumers).

export {
  DirtyTrackerExtension,
  registerDirtyTracker,
  type DirtyTrackerConfig,
  type MarkDirtyCallback
} from './DirtyTrackerExtension';
export {
  ErrorHighlightExtension,
  registerErrorHighlight,
  type ErrorHighlightConfig,
  type ErrorHighlightInputs
} from './ErrorHighlightExtension';
