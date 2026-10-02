---
'@jpmorganchase/mosaic-content-editor-plugin': patch
'@jpmorganchase/mosaic-site-middleware': patch
'@jpmorganchase/mosaic-layouts': patch
---

Editor: Lexical 0.45 + extension API + new-page flow + UX polish

## What changed

The in-browser content editor has been substantially reworked. Three
themes:

1. **Lexical 0.17 → 0.45** — every `@jpmorganchase/mosaic-content-editor-plugin`
   peer dep on `@lexical/*` is bumped to 0.45. Adds `@lexical/extension` as
   the new composition primitive (plugins are still supported; the
   extension API is additive).
2. **Editor UX polish** — structured MDX error banners with line/column
   hints, save-state pill (`clean` / `dirty` / `saving` / `saved`),
   compile indicator, in-editor error highlighting, source-code editor
   toggle, keyboard shortcuts (+ help dialog), unsaved-changes leave-guard.
3. **New-page flow** — `?new=1&title=...` query-string contract creates a
   synthesised page anywhere in the route tree without touching the
   filesystem; the New-Page dialog suggests folders/routes from the live
   sitemap and prevents collisions. Cancel navigates back to the parent
   folder (the route doesn't exist on disk) and strips the create flags.

### Breaking changes (content-editor-plugin)

The plugin's public API has been pruned and rebuilt around per-slice
context hooks:

- **Removed**: `useContentEditor`, `usePageState`. The module-level
  zustand store backing these is gone. Consumers reading editor state
  must migrate to the new `EditorContext` hooks.
- **Added**: `EditorProvider`, plus per-slice hooks
  `useEditorUser`, `useErrorMessage`, `useIsCompiling`, `useSetIsCompiling`,
  `useIsInsertingLink`, `useLineMap`, `usePreviewContent`,
  `useSetPreviewContent`, `useSaveState`. Plus `useEditMode` for entering
  /exiting edit mode by URL flag, `NewPageDialog` for the
  create-page launcher (the in-toolbar New Page button mounts this
  internally; exported so integrators can mount their own launcher),
  and `LayoutNamesProvider` + `useLayoutNames` for opting the layout
  picker into the FrontmatterEditor.
- **Added types**: `EditorUser`, `EditorContextValue`, `LineMapEntry`,
  `SaveState`, `EditMode`, `NewPageDialogProps`, `LayoutNamesProviderProps`.

Migration:

```diff
- import { useContentEditor, usePageState } from '@jpmorganchase/mosaic-content-editor-plugin';
+ import {
+   EditorProvider,
+   usePreviewContent,
+   useSaveState,
+ } from '@jpmorganchase/mosaic-content-editor-plugin';
```

The new context split means high-frequency preview updates no longer
re-render the toolbar — consumers that previously called
`useContentEditor()` and read multiple fields off the result will see
one render per slice they subscribe to instead of one render per state
change.

### Site-middleware additions (non-breaking)

- `loadSitemap()` now supports active mode by fetching `sitemap.xml` from
  the configured `MOSAIC_ACTIVE_MODE_URL`. Returns `[]` (no throw) on
  missing env var, non-OK status, or fetch failure so the New-Page
  dialog degrades to free-text input rather than crashing.

### Layouts additions (non-breaking)

- `LayoutNamesContext` — provider + hooks (`useLayoutNames`,
  `useLayoutsAreStrict`) used by `FrontmatterEditor` to validate the
  `layout` frontmatter key against the host's registered layouts.
  `useLayoutNames()` returns `null` outside a provider (treated as
  "host did not opt in", plain-text fallback applies).
- `LayoutProvider` now filters `EditLayout` and undefined slots out of
  the names it publishes; the remaining names are sorted alphabetical so
  the New-Page dialog's layout dropdown is stable.

### New-page flow (site-side, non-API)

Implementation details live in the reference site:
`packages/site/src/app/[...route]/newPageTemplate.ts` exports
`buildNewPageTemplate` (returns frontmatter + body) and `composeTemplate`
(gray-matter stringify) so integrators can override the seeded template
per-folder without forking the dialog.

## Verification

- **30 new unit tests** across the new surfaces: `loadSitemap` active
  branch (4), `deriveFromSitemap` (8), `buildNewPageTemplate` +
  `composeTemplate` (6), `useEditMode.stopEditing` (5),
  `LayoutNamesContext` provider + hooks (7). All passing.
- **Vitest config extended** to discover `*.test.[jt]s?(x)` under
  `__tests__` in `content-editor-plugin`, `layouts`, and
  `packages/site/src` so future tests in those packages don't need
  another config change.
- **Bug caught + fixed during test-writing**: the default new-page
  template seeded `layout: 'DetailedTechnical'` (typo); real export is
  `DetailTechnical`. The wrong name silently fell back to the host's
  default layout and tripped the FrontmatterEditor's unknown-layout
  warning. Now correct.
