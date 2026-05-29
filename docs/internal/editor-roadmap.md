# Editor Improvement Plan — Lexical Upgrade + UX Roadmap

**Status:** Draft · **Owner:** TBD · **Branch:** `migrate-to-app-router`
**Baseline commits:** `938b9733` (refactor) · `26cc8eb8` (dev-auth) · `e48bcf5c` (preview seed + structured errors)

---

## Why this plan exists

The recent App Router migration cleaned up the editor's *architecture* (Server Actions, context split, code-splitting, structured errors). What it didn't touch is the editor's *user experience*, which still has rough edges that show up the moment a real author starts using it:

- Compile errors are surfaced but not navigable (we have `Ln 12, Col 5` but no in-editor highlight).
- No feedback during the 250 ms debounce → server compile round-trip, so users wonder if the preview is stuck.
- No save-state indicator — "did my save actually go through?".
- Closing the tab mid-edit silently discards work.
- Pasting an image does nothing.
- Authors can only discover available components by reading source.
- Front-matter lives in raw YAML — a misplaced quote breaks the whole page compile.
- Lexical itself is pinned to **0.17.1** while upstream is **~0.36** (May 2026), which means we're missing several API improvements that make the above items materially easier.

This document is the roadmap for closing those gaps, bundled with the Lexical upgrade where it makes sense.

## Out of scope

- **Collaborative editing** (`@lexical/yjs`). Tracked as a possible future workstream; deferred.

---

## Guiding principles

1. **Each phase ships independently.** Every phase ends with a green build, working editor, and a mergeable PR. No multi-week "big bang" branches.
2. **Lexical upgrade is the foundation.** Phase 1 lands the version bump and absorbs any breaking-change fallout in one focused PR; subsequent phases assume the new API surface.
3. **One UX win per phase.** Each subsequent phase is scoped to ~1–2 days of focused work and produces one demonstrable improvement.
4. **Tests come back as Playwright E2E**, not unit tests. We deleted the old jsdom-based editor tests during the App Router migration; the editor is too DOM-heavy and Lexical-coupled for jsdom to give us confidence. E2E covers what matters.
5. **Server safety holds throughout.** `auth()` gate on `page.tsx` and inside every Server Action remains the load-bearing security boundary.

---

## Phase 0 — Establish the baseline (½ day) ✅ partially done

**Outcome:** The current state of the editor is committed, building, and tested in the browser. We can roll back any phase below in isolation.

- [x] Commit in-flight refactor + UX changes in three logical commits (done above).
- [ ] Run `yarn build` at the repo root; confirm no regressions.
- [ ] Run `yarn e2e` in `packages/site`; confirm the existing VIEW-mode tests still pass.
- [ ] Manually exercise the editor (sign in via dev-fake → edit → preview → save) using the dev fake-auth provider to confirm everything works on the new baseline.

**Exit gate:** clean `git status`, green `yarn build`, manual smoke test passes.

---

## Phase 1 — Lexical 0.17 → 0.36 upgrade (2–3 days)

**Outcome:** All `@lexical/*` and `lexical` packages on the latest stable release, all existing functionality unchanged from the user's perspective. This unlocks the API surface used by every subsequent phase.

**What changes in upstream Lexical between 0.17 and 0.36 that matters to us:**

| Area | 0.17 reality | ≥0.20 reality | Why we care |
|---|---|---|---|
| `useLexicalEditable()` | not exported | exported from `@lexical/react` | Cleaner replacement for our `useEditMode` plumbing in some spots. |
| `$onUpdate` API | n/a | available on `LexicalEditor` | Better than wrapping `useTransition` ourselves for some flows. |
| Decorator nodes | manual mount lifecycle | improved `decorate()` + `NodeKey` ergonomics | Needed for error squiggle decorator (Phase 3). |
| `TextNode.isUnmergeable()` | leaky | properly exposed | Needed for the slash-command insertion (Phase 8). |
| `@lexical/markdown` transformers | `MARKDOWN_TRANSFORMERS` shape | refined `Transformer` type with `dependencies` | Our `transformers/` directory will need small type updates. |
| `LexicalErrorBoundary` | gone in newer versions | replaced by `errorBoundary` prop on `RichTextPlugin` | One-line API update. |
| ListItem behaviour | several edge bugs around indent | fixed | Free win, no work. |

**Steps:**

1. Bump all `@lexical/*` and `lexical` deps in `packages/content-editor-plugin/package.json` to the latest stable (single PR, single version pin everywhere).
2. Run `yarn build:bundle` for the plugin and chase compile errors. Expected hotspots:
   - `LexicalErrorBoundary` import location.
   - Transformer types in `transformers/`.
   - Table API has minor shape changes (we have a `TableActionMenuPlugin`).
   - Any direct `EditorState` reads — the JSON serialization format gained `__version` fields.
3. In `packages/site`, run `yarn build` and `yarn dev`, exercise editor flows end-to-end.
4. Update the static-export stub list if any new Lexical chunks need stubbing.
5. Write a short Playwright spec that loads `/[...route]?edit=1`, types a paragraph, and asserts the preview re-renders. This becomes the regression test for every future phase.

**Risk:** medium — Lexical's API is reasonably stable but minor breakage is normal across 20 minor versions. Confined to the `content-editor-plugin` package.

**Exit gate:** plugin builds, site builds, editor renders, types in the editor, save works, no console errors. New Playwright spec green.

---

## Phase 2 — "Compiling…" indicator + save-state pill (½ day)

**Outcome:** The user always knows whether the preview is in sync and whether their save was acknowledged.

**Changes:**

- `PreviewPlugin` exposes `isCompiling` via context (drives off the existing `useTransition` `isPending`).
- New `<CompileStatus />` component lives next to `<StatusBanner />` in the toolbar: shows a small spinner + "Compiling…" while a preview action is in flight, idle otherwise.
- New save-state pill in the toolbar with three states: `Edited`, `Saving…`, `Saved 2m ago` (relative-time updates every 30 s via a single timer). Driven by a new `useEditorDirty` hook that listens to Lexical's update listener and the `persistAction` lifecycle.

**Why it's now-friendly after Phase 1:** modern Lexical's update-listener payload includes `tags` and `dirtyElements` which make "are we dirty since last save?" trivial to compute without our own bookkeeping.

**Risk:** low.

**Exit gate:** Playwright spec asserting the pill text transitions correctly through a save cycle.

---

## Phase 3 — In-editor error highlighting (1 day)

**Outcome:** When the MDX compile fails, the offending line in the editor itself is underlined in red and the banner becomes a clickable "Jump to error" link.

**Changes:**

- New `ErrorHighlightPlugin` reads the structured `error.line` from context.
- Uses Lexical's `editor.update(() => { ... })` to locate the `LineBreakNode` boundaries surrounding the affected line and applies a custom format / decorator that renders an underline.
- `StatusBanner` headline becomes a button: clicking it focuses the editor and scrolls the offending line into view.

**Why it's now-friendly after Phase 1:** decorator-node ergonomics improved in 0.20+ make the line-overlay trivial; on 0.17 it requires hand-rolling more lifecycle code.

**Risk:** medium — needs care around the line-counting model (Lexical's `LineBreakNode` boundaries vs. visual lines).

**Exit gate:** typing `<` shows the squiggle on line 1; clicking the banner moves the cursor to col 2.

---

## Phase 4 — Confirm-on-leave for unsaved changes (½ day)

**Outcome:** Users can't accidentally lose work by closing the tab or clicking a nav link.

**Changes:**

- `useEditorDirty` hook from Phase 2 drives a `window.onbeforeunload` registration (only while dirty + while `?edit=1`).
- Hook into Next.js App Router's `useRouter` to intercept `router.push` and show a confirmation dialog (Salt `<Dialog>`, same pattern as `PersistEditDialog`).
- "Discard" / "Keep editing" buttons; no "Save and leave" yet (deferred to a later phase if asked).

**Risk:** low.

**Exit gate:** Playwright spec asserting the browser confirmation fires when navigating away dirty.

---

## Phase 5 — Image paste & drag-drop (1 day)

**Outcome:** Pasting or dropping an image into the editor inserts a markdown image reference and uploads the bytes via a new Server Action.

**Changes:**

- Register Lexical's `DRAG_DROP_PASTE` command (the upstream `@lexical/react` plugin) in `Editor.tsx`.
- New `uploadImageAction` Server Action (auth-gated like the others) that takes a `FormData`, writes the file to `public/uploads/<hash>.<ext>`, and returns the public URL. (Storage backend is pluggable — local FS for now, S3 later.)
- The existing `MarkdownImagePlugin` already knows how to render `![alt](url)` once we synthesize the markdown.
- Show an inline "Uploading…" toast while the action is in flight.

**Why it's now-friendly after Phase 1:** `DRAG_DROP_PASTE_COMMAND` exists in older Lexical too, but the `editor.read()`/`editor.update()` helpers around it are saner post-0.20.

**Risk:** medium — storage decisions (where do uploads live in S3? what's the lifecycle?) need product input.

**Exit gate:** Playwright spec that dispatches a synthetic paste event with a PNG blob and asserts the resulting markdown contains `![*.png](*)`.

---

## Phase 6 — Keyboard shortcut hints + save shortcut (¼ day)

**Outcome:** Toolbar buttons advertise their shortcuts; `⌘S` / `Ctrl+S` opens the save dialog.

**Changes:**

- Each `<ToolbarButton>` gets a `shortcut` prop rendered in its Salt `<Tooltip>` (e.g. `Bold ⌘B`).
- Global keydown handler in `Editor.tsx` intercepts `⌘S` → opens save dialog; `Escape` while dialog open → cancels (only if not actively saving).
- Document the full shortcut table in `packages/content-editor-plugin/README.md`.

**Risk:** trivial.

**Exit gate:** keyboard nav works in Playwright.

---

## Phase 7 — Front-matter form editor (1–1.5 days)

**Outcome:** A "Front matter" tab in the editor (alongside "Body") that renders the frontmatter as a form, eliminating the "I broke the YAML" failure mode.

**Changes:**

- Re-introduce a tab strip above the editor: `Body` / `Front matter`.
- The `Front matter` panel renders Salt form fields keyed off the page's `meta` schema (we already have schema definitions in `packages/schemas/`).
- Two-way binding: form changes update the markdown's frontmatter block; raw-YAML edits in Body reflect back into the form on switch.
- Validation surfaces inline next to fields rather than as MDX compile errors.

**Risk:** medium — schema discovery from the live page may need new metadata to flow from the loader to the client. May be a smaller subset first (well-known fields like `title`, `description`, `tags`) and expand.

**Exit gate:** editing `title` in the form updates the H1 in the preview.

---

## Phase 8 — Slash-command component menu (1.5–2 days)

**Outcome:** Typing `/` in the editor opens a fuzzy-search menu of available MDX components scoped to the current page. Selecting one inserts a stubbed `<ComponentName />` (with required-prop placeholders).

**Changes:**

- New `SlashCommandPlugin` using Lexical's `LexicalTypeaheadMenuPlugin` (the standard pattern from upstream playgrounds).
- The list of available components is derived from `mdxComponents` (already passed to `EditorBody`) plus a static catalog of intrinsic MD elements.
- Insertion synthesizes Lexical text nodes for the JSX-as-markdown string and lets the existing markdown shortcut pipeline handle re-parse on next compile.

**Why it's now-friendly after Phase 1:** `LexicalTypeaheadMenuPlugin` had several positioning bugs fixed between 0.17 and 0.25; trying to use it pre-upgrade would mean shipping the workarounds.

**Risk:** medium-high — first time we'll be inserting non-markdown content (JSX) from the editor, so the round-trip through markdown serialise/parse needs careful testing.

**Exit gate:** typing `/Tile<Enter>` inserts `<TileA />` and the preview renders the tile.

---

## Phase 9 — Diff preview before save (½ day)

**Outcome:** The save dialog shows a unified diff of "what's about to be committed" before the user clicks Raise PR.

**Changes:**

- Compute the diff in the existing `persistAction` flow (we already have original + new markdown; `diff` library is small and tree-shakeable).
- `PersistDialog` gains a "Review changes" expandable section that renders the diff with Salt typography styling.
- No new server work; entirely a client improvement.

**Risk:** low.

**Exit gate:** diff renders correctly for a change, hidden when unchanged.

---

## Phase 10 — Source / WYSIWYG toggle (1 day)

**Outcome:** A toggle in the toolbar that swaps the Lexical editor for a plain `<textarea>` with the raw markdown, for users who prefer working in source.

**Changes:**

- New `RawEditor` component (vanilla textarea with monospaced styling).
- Toolbar toggle controls which is mounted.
- Same `compilePreview` Server Action drives the preview pane regardless of editor mode — only the input source changes.
- Round-trip is lossy in theory (Lexical may normalise whitespace differently than the source); preserve the user's choice in `?edit=1&mode=source` to keep URL-driven state working.

**Risk:** low-medium — the round-trip caveat needs documentation if not solved.

**Exit gate:** toggle preserves cursor position across switch.

---

## Phase 11 — `remark-lint` diagnostics in the banner (1–1.5 days)

**Outcome:** The status banner shows not just compile errors but lint warnings (dead links, missing alt text, broken anchor IDs) as the user types.

**Changes:**

- `previewAction` runs `remark-lint` (with whatever ruleset the CI uses) in addition to compile, and returns warnings alongside the compiled source.
- Banner gains a "warnings" tier (yellow) below the error tier (red); both can be present.
- Phase 3's error-line highlighting extends naturally to underline warning lines in yellow.

**Risk:** medium — needs alignment with the existing CI lint rules; potentially noisy if the ruleset is strict. May want a "show only errors" toggle.

**Exit gate:** a `[broken-link]()` produces a yellow warning with line info.

---

## Phase 12 — Component prop autocomplete (stretch, 3–5 days)

**Outcome:** When the user is inside `<Foo |>`, an autocomplete menu shows `Foo`'s available props derived from its TypeScript types.

**Changes:**

- New build step in `packages/components/` (and any other component package) that emits a JSON manifest of each component's prop signature using `react-docgen-typescript`.
- Manifest is bundled with the site at build time and read by a new Lexical plugin.
- Autocomplete UI reuses Phase 8's typeahead infrastructure.

**Risk:** high — large scope, depends on consistent component patterns across packages. Worth doing only if Phase 8 is heavily used.

**Exit gate:** typing `<Tile a` inside an MDX block surfaces a list of `Tile`'s props.

---

## Sequencing summary

```
Phase 0   ── Baseline                            ½d
Phase 1   ── Lexical upgrade                     2–3d  ← foundational, must come first
   ├── Phase 2  Compiling + save pill            ½d
   ├── Phase 3  Error line highlighting          1d
   ├── Phase 4  Confirm-on-leave                 ½d
   ├── Phase 5  Image paste                      1d
   ├── Phase 6  Shortcut hints                   ¼d
   ├── Phase 7  Front-matter form                1–1.5d
   ├── Phase 8  Slash-command menu               1.5–2d
   ├── Phase 9  Diff before save                 ½d
   ├── Phase 10 Source/WYSIWYG toggle            1d
   └── Phase 11 remark-lint warnings             1–1.5d
Phase 12  ── Component prop autocomplete         3–5d  ← stretch, depends on Phase 8
```

Phases 2–11 are mostly independent post-Phase 1 — they can ship in any order, in parallel, or in a series of small PRs. Phases 3 and 11 benefit from being adjacent (Phase 11 piggybacks on Phase 3's highlight infrastructure). Phase 12 should only be attempted if Phase 8 lands and gets real usage.

## Rollback strategy

Every phase ships behind a feature flag in `mosaic.config.mjs` where reasonable (e.g. `editor.experimental.imagePaste = false` defaults). If a phase regresses production, flip the flag, ship a hotfix, then fix forward on a branch.

The three baseline commits (`938b9733`, `26cc8eb8`, `e48bcf5c`) constitute the "known-good" rollback target for the whole stack; the Lexical upgrade in Phase 1 will be the first commit where rolling back means losing later UX work too.

## Open questions

1. **Hosting for uploaded images (Phase 5)** — local FS works for the dev mode but production needs S3 or similar. Who owns this decision?
2. **Schema for the front-matter form (Phase 7)** — do we want to extend `packages/schemas/` to be the single source of truth, or hand-roll a separate editor-side schema? Implications for CMS-mode in the future.
3. **`remark-lint` ruleset (Phase 11)** — adopt the existing CI rules verbatim, or curate a subset that's tighter (errors only) for in-editor display to avoid noise?
4. **Component manifest format (Phase 12)** — if we do this, should the manifest also flow into the API-reference docs site so we get docs-from-types as a side effect?

Open questions are blockers for the *individual phases* that depend on them, not for starting Phase 1 (the Lexical upgrade), which is unaffected.

---

## Recommended next action

Start **Phase 1 (Lexical upgrade)** as its own branch off the current baseline. It's the foundation; everything else is faster once it's done, and the upgrade itself doesn't risk any UX regression — it's purely a substrate change.

