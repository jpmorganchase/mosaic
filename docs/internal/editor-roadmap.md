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

## Phase 1 — Lexical 0.17 → 0.44 upgrade (2–3 days) ✅ DONE (`feat/lexical-upgrade`)

**Outcome:** All `@lexical/*` and `lexical` packages bumped to **0.44.0** (latest stable as of May 2026), all existing functionality unchanged from the user's perspective. Site and plugin both build cleanly; dev-server smoke test passes; new Playwright spec `packages/site/e2e/editor.test.ts` codifies the regression net.

**What actually broke in the upgrade:**

- **One type error** in `transformers/tableRule.ts`: the `Transformer.replace` field is now optional in the modern type definitions. Fixed with a `&&` guard — no behaviour change, no runtime risk.

That was it. Everything else (LexicalErrorBoundary, the markdown TRANSFORMERS shape, table API, theme types, command symbols) survived the 27-minor-version jump untouched.

**Regression net:** `packages/site/e2e/editor.test.ts` covers (a) editor + seeded preview render on `?edit=1`, (b) typing into the editor propagates to the preview via the Server Action, (c) invalid MDX surfaces the structured error banner with the plain-English hint. Run with `yarn e2e` from `packages/site` against a dev server that has `MOSAIC_DEV_FAKE_AUTH=true` + `NEXT_PUBLIC_ENABLE_LOGIN=true`.

**APIs newly available** that subsequent phases will lean on:
- `useLexicalEditable()` from `@lexical/react` — cleaner read-only/edit gating.
- `$onUpdate` callback API on `LexicalEditor`.
- Improved `DecoratorNode` ergonomics — needed for the error-line decorator in Phase 3.
- Stable `LexicalTypeaheadMenuPlugin` positioning — needed for slash-commands in Phase 8.
- Update-listener payload exposes `dirtyElements` + `tags` — needed for the dirty-state pill in Phase 2.

**Exit gate met:** plugin builds, site builds (`yarn build` clean, 8 routes), dev-server smoke test passes, no Lexical runtime warnings in the dev log, Playwright spec authored.

---

## Phase 2 — "Compiling…" indicator + save-state pill (½ day) ✅ DONE (`feat/lexical-upgrade`)

**Outcome:** Two new at-a-glance status indicators live in the toolbar's right-hand tooltray:

- **`<CompileStatus />`** — spinner + "Compiling…" while a preview Server Action is in flight; hidden when idle. Driven by a new `isCompiling` context slice that `PreviewPlugin` flips synchronously around its `startTransition` (so it shows immediately on keystroke, not after `useTransition`'s non-urgent pending state settles).
- **`<SaveStatePill />`** — explicit FSM rendered as a coloured pill: `clean` (hidden) → `dirty` ("Edited", warning tone) → `saving` ("Saving…", info tone + spinner) → `saved` ("Saved {relative time}", success tone). Owns a single 30 s interval that auto-refreshes the relative-time string while in `saved`; tears the interval down for every other state so no timers leak.

**Implementation details worth remembering:**

- The FSM lives in `EditorContext` as a `SaveState` union (`'clean' | 'dirty' | 'saving' | 'saved'`) plus a `lastSavedAt: number | undefined`. Transitions are funnelled through stable `markDirty` / `markSaving` / `markSaved` / `markSaveFailed` callbacks so consumers don't have to model the state machine themselves.
- `DirtyTrackerPlugin` bridges Lexical's `registerUpdateListener` into `markDirty()`, with three filters to avoid false positives: a `useRef` armed-after-first-update guard, `tags.has('history-merge' | 'historic')` to ignore hydration/undo events, and `dirtyElements.size === 0 && dirtyLeaves.size === 0` to ignore pure selection moves.
- `SaveButton` no longer owns its own `OnChangePlugin` + local `isDisabled` state. It now reads `useSaveState()` directly: enabled iff `dirty` or `saved` (the latter so authors can immediately re-save after a successful PR), disabled while `saving` to suppress double-clicks.
- `PersistDialog` calls `markSaving()` on save start, `markSaved()` on successful complete, `markSaveFailed()` on error (which transitions back to `dirty` so the user can retry).

**Regression net extension:** `editor.test.ts` gains two cases under `editor status pills — Phase 2`:
- Save-state pill is hidden in `clean`, becomes "Edited" after typing.
- "Compiling…" status appears during a preview round-trip and disappears after.

**APIs unblocked for later phases:**
- `useSaveState()` — the foundation for Phase 4's confirm-on-leave (`saveState !== 'clean'` is the dirty signal).
- The `dirty` ↔ `clean` transitions are now centralised, so we won't need to re-derive "is this editor dirty" from update-listener payloads in three different places.

**Exit gate met:** plugin builds, site builds, dev-server smoke OK, no console errors.

---

## Phase 3 — In-editor error highlighting (1 day) ✅ DONE (`feat/lexical-upgrade`)

**Outcome:** When the MDX compile fails, the offending block in the editor itself is underlined with a wavy red squiggle and the banner becomes a clickable "Jump to error" link that scrolls + focuses the caret onto the broken block.

**What landed:**

- New `$buildLineMap` utility serializes each top-level Lexical block in isolation via a small `Proxy` over the block (`getChildren()` returns `[block]`) so a single `$convertToMarkdownString(transformers, proxy)` call exercises the same `exportTopLevelElements` path as the canonical full-document export. This avoids re-implementing `@lexical/markdown`'s un-exported `exportChildren` / `exportTextFormat` helpers. The first version naively called `$convertToMarkdownString(transformers, block)` — that overload iterates the *block's* children (text nodes) as top-level, so per-block reassembly always diverged and the line map was always null. The Proxy fix gives us a map from 1-based markdown line → top-level `NodeKey` that matches the canonical output line-for-line.
- New `ErrorHighlightPlugin` consumes `error.line` + `getLineMap()`, resolves the `NodeKey`, looks up the DOM element via `editor.getElementByKey`, and toggles a `mosaic-editor-error-line` class. CSS in `Editor.css.ts` applies a wavy red `text-decoration` plus a faint tinted background — no Lexical node insertion, so it never round-trips back into the markdown.
- `StatusBanner` headline gains a "Jump to error" button. The plugin registers an imperative handle via the `focusErrorRegistry` module so the banner can invoke it without a Lexical context dep. The handler runs `el.scrollIntoView({ block: 'nearest' })` + `editor.update(() => $getNodeByKey(key).selectEnd())` with `onUpdate: editor.focus` — i.e. it scrolls the block into view AND moves the caret to the end of the broken block so the user can start fixing immediately rather than landing on whatever stale selection Lexical remembered.
- Dismiss only hides the banner; it does NOT clear the underlying error context (so the red squiggle persists — the doc is still broken). `StatusBanner` records a `dismissedSig = message::line::column`; a subsequent error with the same signature stays dismissed, a different one (or a successful compile) re-shows.

**Latent bugs surfaced and fixed:**

- **Stale-response race in `PreviewPlugin`.** Two debounced compiles (`<x` then `delete <x`) could resolve out of order, with the earlier failing compile overwriting the later success and resurrecting a stale error. Fixed with a monotonic `compileSeqRef` — promises that resolve after a newer compile has been issued no-op rather than writing state. Same guard around `setIsCompiling(false)` so an earlier response can't flip the spinner off while a newer compile is still running.
- **Error flash during typing.** The original 250 ms debounce meant pausing mid-component (`<Card `, `<Card title=`) painted red on every keystroke pause, training users to ignore the banner. Errors now wait out an `ERROR_GRACE_MS = 800` ms idle window before being surfaced (preview pane still updates at 250 ms — only the red UI is held back). Successful compiles clear errors immediately (good news is urgent). The next `onChange` also optimistically clears any visible error so the squiggle vanishes the moment the user types, instead of lingering until the next compile finishes.

**Files touched (plugin):**
- `src/utils/buildLineMap.ts`, `src/plugins/ErrorHighlightPlugin.tsx`, `src/plugins/PreviewPlugin.tsx`, `src/components/StatusBanner.tsx`, `src/components/Editor.css.ts`.

**Exit gate met:** typing `<x` into a real block produces a red squiggle on the offending paragraph; the banner's "Jump to error" button scrolls + selects the broken block; Dismiss hides the banner without erasing the squiggle; fixing the markdown clears both immediately; partial JSX (`<Card`, `<Card title=`) does not flash red mid-typing.

---

## Phase 4 — Confirm-on-leave for unsaved changes (½ day) ✅ DONE (`feat/lexical-upgrade`)

**Outcome:** Users can no longer accidentally lose work by closing the tab, reloading, or clicking a nav link while the editor is dirty.

**What landed:**

- New `LeaveGuardPlugin` mounted alongside the other editor plugins inside `Editor.tsx`. Active only while `useSaveState() !== 'clean'` AND the editor is mounted (which already implies `?edit=1`).
- Three navigation channels covered, each with the smallest possible intercept:
  - **Tab close / reload / manual URL bar change** — `window.addEventListener('beforeunload', e => { e.preventDefault(); e.returnValue = ''; })`. Modern browsers ignore the message string and show their own native confirmation; we can't customise the copy but the native prompt is enough to stop accidents.
  - **In-app anchor clicks (`<a>`, Next `<Link>`)** — document-level `click` listener registered in the **capture phase** so it runs before App Router's bubbled handler. A small `resolveInAppNavigation` helper short-circuits non-guardable clicks (modifier keys, middle-click, `target=_blank`, `download` attribute, cross-origin, in-page hash) so opening a copy in a new tab still works without prompting. When a guardable click is captured we `preventDefault` + `stopPropagation` and queue the navigation behind a Salt confirm dialog.
  - **Programmatic `router.push` / `replace`** — monkey-patches `window.history.pushState` and `replaceState` while dirty; non-null `url` arguments resolve to the navigation target and queue the same dialog. Calls with `url == null` (state-only pushState) pass straight through.
- On **Discard**, the queued navigation is executed as a full-page `window.location.assign(href)`. The first version of this used soft-routing (`pushState` + manual `popstate` dispatch / replaying the cached real `pushState`), but App Router's RSC machinery wasn't re-running for either path — the URL bar updated but the editor's React subtree stayed mounted on the wrong route. For a "Discard my work" path a hard reload is fine and arguably correct: the user explicitly chose to abandon in-memory state, so paying for a fresh document load (server data, clean React tree, no lingering listeners) is exactly what we want.
- Salt `Dialog` with "Keep editing" (returns to the editor, preserves dirty state) and a `sentiment="negative"` "Discard changes".
- All three patches tear themselves down when `saveState` returns to `clean` or the plugin unmounts. `historyPatched` module flag protects against double-install during HMR / React strict-mode double-invoke.

**Verified end-to-end** in the running dev server:
- Clean editor → click a sidebar link → navigates immediately, no prompt.
- Dirty editor → click a sidebar link → Salt dialog appears, URL unchanged. "Keep editing" closes the dialog and the `●Edited` pill stays. "Discard changes" completes the navigation to the target URL.
- Dirty editor → `playwright-cli goto` (synthetic reload) → native `beforeunload` confirmation fires.

**Exit gate met:** all three channels prompt; clean state is a no-op; Discard doesn't re-prompt itself.

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

## Phase 6 — Keyboard shortcut hints + save shortcut (¼ day) ✅ DONE (`feat/lexical-upgrade`)

**Outcome:** Toolbar buttons advertise their shortcuts; `⌘S` / `Ctrl+S` opens the save dialog; `⌘K` / `Ctrl+K` opens the Insert Link dialog; `⌘/` / `Ctrl+/` opens an in-app cheatsheet listing every shortcut.

**What landed:**

- New `src/utils/shortcuts.ts` is the single source of truth — every binding is authored in canonical `Mod+Key` form (e.g. `Mod+Shift+Z`) and converted at the consumption sites into (a) a platform-formatted tooltip label (`⌘B` on mac, `Ctrl+B` elsewhere using the canonical Apple ⌃⌥⇧⌘ glyph order on mac and `+`-separated tokens elsewhere), (b) a WAI-ARIA-compliant `aria-keyshortcuts` value, and (c) a `KeyboardEvent` predicate. Platform detection is `navigator.platform` substring-matched against `Mac|iPhone|iPad` and memoised on first call — `userAgentData.platform` would be ideal but Safari hasn't shipped it.
- `ToolbarButton` gained an optional `shortcut?: string` prop. When present it appends the formatted glyphs to the tooltip title and sets `aria-keyshortcuts` on the underlying `<button>`. Existing shortcut-less call sites are untouched (prop is optional and presentational-only — wiring the keystroke is a separate concern).
- Per-button hints wired: Bold `⌘B`, Italic `⌘I`, Undo `⌘Z`, Redo `⇧⌘Z`, Insert Link `⌘K`. Bold / Italic / Undo / Redo are already bound inside Lexical's `RichTextPlugin` + `HistoryPlugin` — we only *advertise* those, no new command registration. Inline Code intentionally has no shortcut hint: Lexical doesn't bind one by default and faking a shortcut in the tooltip that doesn't actually work would be worse than no hint.
- `SaveButton` shows the `⌘S` hint via a native `title` (not a Salt tooltip — the CTA button isn't wrapped by `ToolbarButton` and adding a Label wrapper would force special-casing the disabled state) plus the same `aria-keyshortcuts` attribute, so screen-reader users and sighted users both see the binding.
- New `KeyboardShortcutsPlugin` mounted in `Editor.tsx` registers the two editor-app bindings on `window` (capture not needed — these aren't fighting any other handler):
  - `⌘S` → `onSave()` with `preventDefault` so the browser's "Save Page As" never opens.
  - `⌘K` → `setIsInsertingLink(true)` with `preventDefault` so Chrome / Firefox don't focus the URL bar.
- Both bindings skip if the focused element is an external editable surface (an `<input>` / `<textarea>` / `contentEditable` outside the editor root), so typing `⌘S` into the PR-link search field inside an already-open dialog doesn't reopen the save dialog on top of it. The editor root is tagged with `data-mosaic-editor-root="true"` to disambiguate "editor's own contentEditable" (proceed) from "some other contentEditable" (skip).
- `Escape` to close the save dialog needed no new code — Salt's `Dialog` handles it natively and the existing `resetAndClose` already no-ops while a save is in flight, so the "Esc-during-save" footgun is closed by construction.
- README replaced (was a 7-line stub) with a real shortcut table that points readers at `shortcuts.ts` as the source of truth for adding new bindings.
- **In-app cheatsheet** (`ShortcutHelpDialog`) — added on top of the original plan because hovering each toolbar button one at a time is a poor way to discover what's available. The dialog is data-driven from the `SHORTCUTS` + `SHORTCUT_LABELS` maps (so it can't drift out of sync), opened either by the `?` icon on the right of the toolbar or via `⌘/`. The `⌘/` binding *toggles* (not just opens) so users who hit it accidentally can dismiss without reaching for the mouse — matches the VS Code / Linear convention. The dialog's open-state lives in `EditorContext` as its own slice (`useShortcutHelp`) so both callers (toolbar button + keyboard plugin) mutate it without threading state through `Editor.tsx`.

**Playwright coverage** (`packages/site/e2e/editor.test.ts`):
- `Mod+S` from inside the editor opens the save dialog (asserts the dialog wasn't already mounted, focuses the editor, presses `ControlOrMeta+S`, asserts the `Save Changes` dialog becomes visible).
- Bold button exposes `aria-keyshortcuts` matching `^(Meta|Control)\+B$` (cross-platform — CI is Linux, dev is mac).
- `Mod+K` opens the Insert Link dialog.
- `Mod+/` toggles the shortcut-help dialog and the dialog lists every binding from `SHORTCUT_LABELS` (asserts on text content rather than table rows so swapping `<table>` for a `<ul>` later wouldn't break the test).
- The toolbar's `?` button (accessible name "Keyboard shortcuts") opens the same dialog.

**Exit gate met:** all three shortcuts work end-to-end in the browser; toolbar tooltips show the platform-correct glyphs (`⌘` on mac, `Ctrl+` on linux); shortcuts are inert when focus is in a non-editor input.

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
Phase 0   ── Baseline                            ½d   ✅ done
Phase 1   ── Lexical upgrade (0.17 → 0.44)       0.5d ✅ done (1 line of code touched, plus the bump)
   ├── Phase 2  Compiling + save pill            ½d   ✅ done
   ├── Phase 3  Error line highlighting          1d   ✅ done
   ├── Phase 4  Confirm-on-leave                 ½d   ✅ done
   ├── Phase 5  Image paste                      1d   ⏸ deprioritised
   ├── Phase 6  Shortcut hints                   ¼d   ✅ done
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

Phases 1–4, Phase 6, Phase 9 and Phase 10 are in the can on `feat/lexical-upgrade`. Phase 5 (image paste & drag-drop) is deprioritised. Next pickup candidate: **Phase 7 — Front-matter form** (1–1.5d) — finally exposes the YAML metadata as a structured edit surface so authors don't need to drop into source mode for tag tweaks. After that, **Phase 11 — `remark-lint` diagnostics** (1–1.5d) builds on the Phase 3 banner to surface dead links / missing alt text / broken anchor IDs as the user types.

























