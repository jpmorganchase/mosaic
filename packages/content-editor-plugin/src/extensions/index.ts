'use client';

/**
 * Phase 0 — Re-exports for the Extension API authoring layer.
 *
 * Each extension here packages the register-effect of one of our
 * existing React-component plugins so it can later be mounted via
 * `<LexicalExtensionComposer extension={rootExtension} />`. None of
 * these extensions are mounted by the live editor yet — `Editor.tsx`
 * still uses the React component form for every plugin — so runtime
 * behaviour is unchanged by this file's existence.
 *
 * The reason this barrel exists is so the eventual root-extension
 * file (planned Phase 2 of the Extension API roadmap) can do a
 * single `import { ... } from './extensions'` rather than reaching
 * into each per-extension file.
 *
 * Audit trail: which React-plugin became which extension and what
 * we deliberately left out:
 *
 *   - `HorizontalRulePlugin`  → `HorizontalRuleExtension`     (full)
 *   - `MarkdownImagePlugin`   → `MarkdownImageExtension`      (full)
 *   - `MarkdownLinkPlugin`    → `MarkdownLinkExtension`       (command only;
 *      the `<InsertLinkDialog />` JSX surface stays in the React
 *      plugin file and will be hoisted to a composer sibling /
 *      ReactExtension decorator in a later phase)
 *
 * The four other "leaf-ish" plugins were explicitly NOT migrated in
 * Phase 0:
 *
 *   - `ErrorHighlightPlugin` — depends on React context
 *     (`useErrorMessage`, `useLineMap`) for its input signal.
 *     Extensions run in `register` phase before React renders, so
 *     they can't read context. This one stays as a React component
 *     and bridges via signals in Phase 1.
 *
 *   - `KeyboardShortcutsPlugin` — same constraint: reads
 *     `useIsInsertingLink` and `useShortcutHelp` from context.
 *
 *   - `DirtyTrackerPlugin` — same constraint: drives
 *     `markDirty()` from `EditorContext`.
 *
 *   - `PreviewPlugin` — depends on the `previewAction` Server
 *     Action prop and on `EditorContext` slices for state writes.
 *
 * Those four migrate in Phase 1 (signals bridge) and Phase 3 (context
 * teardown), not Phase 0.
 */

export { HorizontalRuleExtension } from './HorizontalRuleExtension';
export { MarkdownImageExtension } from './MarkdownImageExtension';
export { MarkdownLinkExtension } from './MarkdownLinkExtension';
