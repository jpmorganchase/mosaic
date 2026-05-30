'use client';

/**
 * Extension API authoring layer — final state after Phase 0d.
 *
 * Every plugin in this directory follows **one** pattern, matching
 * upstream Lexical's `ClearEditorExtension` / `LexicalClearEditorPlugin`
 * split (see `@lexical/extension/src/ClearEditorExtension.ts` and
 * `@lexical/react/src/LexicalClearEditorPlugin.ts` for the model):
 *
 *   1. A standalone `register*(editor, ...inputs)` helper that owns
 *      the Lexical-touching logic (command registration, update
 *      listener, DOM mutation, etc.) and returns its own unregister
 *      function.
 *
 *   2. A thin `defineExtension(...)` wrapper whose `register` field
 *      calls the helper. Plus `build` + `namedSignals` for the
 *      extensions that take reactive config (the Phase-0c pair).
 *
 *   3. A consumption site:
 *      - **React-hosted editor (us, today)**: imports the helper
 *        directly and calls it from a `useEffect` in `Editor.tsx`
 *        with the right dep array. Reactive inputs come from React
 *        context / refs / props; useEffect-with-deps gives us the
 *        re-register-on-change semantics for free.
 *      - **Headless / non-React (hypothetical, future)**: depends
 *        on the extension via `buildEditorFromExtensions`. Reactive
 *        inputs come through `namedSignals` and re-register via
 *        `effect(...)`.
 *
 * Both consumption modes share one implementation. The React side
 * is what the live editor uses; the extension form is what the
 * smoke test exercises and what a future non-React consumer would
 * mount.
 *
 * Two-category split
 * ------------------
 * The five extensions split by whether they take reactive config:
 *
 *   - **Command handlers (no reactive config)**:
 *     `HorizontalRuleExtension`, `MarkdownImageExtension`,
 *     `MarkdownLinkExtension`. The helper takes just `editor`. The
 *     extension's `register` is a one-liner that calls the helper.
 *
 *   - **Context-bridged (reactive config)**:
 *     `DirtyTrackerExtension`, `ErrorHighlightExtension`. The helper
 *     takes `editor` plus one or more inputs (`markDirty` callback,
 *     `getError` / `getLineMap` getters). The extension's `build`
 *     turns its config into a `namedSignals` object; its `register`
 *     wraps the helper call in `effect(...)` so signal writes
 *     re-register with fresh inputs.
 *
 * Plugins that explicitly stay React
 * ----------------------------------
 * Two plugins were considered for migration during Phase 0c and
 * deliberately not migrated. Their file-level doc comments explain
 * the specific reasoning; the short version:
 *
 *   - `KeyboardShortcutsPlugin` registers a `window` keydown listener
 *     and never touches `editor`. An extension wrapper would be
 *     empty ceremony.
 *
 *   - `PreviewPlugin` is a React async coordinator (`useTransition`,
 *     memoised `debounce`, sequencing refs, four context-slice
 *     writes, renders `<OnChangePlugin>` JSX). The extension form
 *     would be strictly larger and less idiomatic. Upstream's
 *     `LexicalAutoFocusPlugin` is the precedent for "plain React
 *     effect, no extension wrapper".
 *
 * Why this barrel doesn't ship a `ROOT_EXTENSIONS` array any more
 * ---------------------------------------------------------------
 * Phase 0b shipped an `<ExtensionMounter>` component + a
 * `ROOT_EXTENSIONS` constant that auto-mounted the three
 * command-handler extensions through a generic React bridge. Phase
 * 0d removed both in favour of the upstream-idiomatic per-helper
 * pattern: `Editor.tsx` calls `mergeRegister(registerHorizontalRule(editor),
 * registerMarkdownImage(editor), registerMarkdownLink(editor))` from
 * one `useEffect`, which is what `<ExtensionMounter>` was wrapping
 * anyway. The mounter required fabricating an `ExtensionRegisterState`
 * stub for the dependency-resolver fields it couldn't fulfil; the
 * per-helper pattern doesn't need any stubbing because the helper
 * signature is just `(editor) => unregister`. Smaller code, fewer
 * fragile assumptions about upstream's evolving `ExtensionRegisterState`
 * shape, single uniform pattern across all five extensions.
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
