'use client';

/**
 * Editor shell that owns mode switching.
 *
 * Two view modes share the same outer chrome (toolbar, status
 * banner, save dialog, leave guard, keyboard shortcuts, preview
 * pane) and swap only the input surface in the left pane:
 *
 *   - WYSIWYG (`mode=wysiwyg`, default): Lexical composer + all
 *     Lexical-coupled plugins (preview, dirty tracker, error
 *     highlight, table action menu, floating toolbar).
 *   - Source (`mode=source`): a plain textarea + a slimmed-down
 *     compile pipeline that drives the same preview/error/save
 *     contexts.
 *
 * The current markdown is sourced via `getCurrentMarkdownRef`
 * which each mode reinstalls on mount: WYSIWYG reads Lexical,
 * Source reads the textarea. `PersistDialog` reads through that
 * ref so it doesn't need to know which mode is active.
 *
 * Mode flips
 * ----------
 * Switching modes preserves two things, in priority order:
 *
 *   1. Content. ModeToggle calls `prepareModeFlip()`
 *      synchronously before `setMode()` writes the URL, which
 *      captures the outgoing mode's markdown + cursor location
 *      into `bridgeRef`. The new mode reads from that ref to
 *      seed itself.
 *
 *   2. Cursor (block-level). We capture which top-level block
 *      the caret is in (0-based index) and re-seat the caret in
 *      the equivalent block in the new mode. Intra-line column
 *      position is NOT preserved — Lexical's selection model is
 *      node-based and reconstructing exact column across two
 *      different rendering strategies isn't worth the complexity
 *      for a docs editor where authors switch modes between
 *      edits, not mid-word. Block-level preservation matches the
 *      "toggle preserves cursor position" guarantee in the way
 *      authors actually experience it.
 */

import { ComponentType, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import matter from 'gray-matter';
import { debounce } from 'lodash-es';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import Split from 'react-split';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { $getRoot, $getSelection, $isRangeSelection, mergeRegister } from 'lexical';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import transformers from '../transformers';
import ContentEditor from './ContentEditor';
import { nodes } from '../nodes';
import {
  EditorProvider,
  usePreviewContent,
  useSetPreviewContent,
  useSetIsCompiling,
  useErrorMessage,
  type EditorUser
} from '../EditorContext';
import { PreviewPlugin } from '../plugins/PreviewPlugin';
import { DirtyTrackerPlugin } from '../plugins/DirtyTrackerPlugin';
import { ErrorHighlightPlugin } from '../plugins/ErrorHighlightPlugin';
import styles from './Editor.css';
import Toolbar from './Toolbar/Toolbar';
import theme from '../theme';
import { PersistDialog, type PersistEvent } from './PersistEditDialog';
import StatusBanner from './StatusBanner';
import RouteNoticeBanner from './RouteNoticeBanner';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';
import { InsertLinkDialog } from './Toolbar/InsertLink';
import { registerHorizontalRule, registerMarkdownImage, registerMarkdownLink } from '../extensions';
import { formatMdxError } from '../utils/formatMdxError';
import { blockIndexAtOffset, blockStartOffset } from '../utils/markdownBlocks';
import { mergeAuthoredFrontmatter } from '../utils/mergeAuthoredFrontmatter';
import { LinkEditor } from './LinkEditor/LinkEditor';
import { ScrollableSection } from './ScrollableSection/ScrollableSection';
import { FloatingToolbarPlugin } from '../plugins/FloatingToolbarPlugin';
import { TableActionMenuPlugin } from '../plugins/TableActionMenuPlugin';
import { LeaveGuardPlugin } from '../plugins/LeaveGuardPlugin';
import { KeyboardShortcutsPlugin } from '../plugins/KeyboardShortcutsPlugin';
import { useEditorMode, type EditorMode } from '../useEditorMode';
import {
  ModeBridgeProvider,
  type ModeBridgeContextValue,
  type ModeBridgeSnapshot
} from './ModeBridgeContext';
import { SourceEditor, type SourceEditorHandle } from './SourceEditor/SourceEditor';
import { FrontmatterPanel } from './FrontmatterViewer/FrontmatterPanel';
import { WysiwygFormattingTooltrays } from './Toolbar/WysiwygFormattingTooltrays';
import { FormattingToolbarSlotProvider } from './FormattingToolbarSlot';

function onError(error: Error) {
  console.error(error);
}

const initialConfig = {
  namespace: 'mosaic-content-editor',
  onError,
  nodes,
  theme
};

export interface PreviewComponentProps {
  source: SerializeResult | undefined;
  meta?: Record<string, unknown>;
  components: Record<string, unknown>;
}

/**
 * Outcome of the host's raw-source fetch.
 *
 * Structurally compatible with `MdxRawSourceResult` from
 * `@jpmorganchase/mosaic-site-middleware` — defined locally
 * (rather than imported) so this plugin stays decoupled from
 * the Next host's middleware package and the dependency graph
 * keeps flowing in one direction.
 *
 * The editor consumes this in the Frontmatter tab: when
 * `kind === 'raw'` the panel mounts the editable
 * `FrontmatterEditor` against the pre-plugin bytes (exactly
 * what `git diff` of the source file would show), and the save
 * dialog ships an `authoredFrontmatter` slice that the workflow
 * writes back. Every other kind falls back to a read-only
 * viewer over the post-plugin enriched `content` and uses the
 * discriminator to pick banner copy explaining *why* (snapshot
 * mode, virtual page, unsupported source kind, …).
 *
 * Hosts that can't (or choose not to) fetch raw source pass
 * `undefined`; the editor falls back to the read-only viewer
 * without further configuration.
 */
export type RawSourceInput =
  | { kind: 'raw'; bytes: string; namespace: string | undefined }
  | { kind: 'not-found' }
  | { kind: 'no-matching-source' }
  | { kind: 'unsupported-source'; modulePath: string | undefined }
  | { kind: 'unavailable-in-mode'; mode: string };

export interface EditorProps {
  content: string;
  /**
   * Raw on-disk source for the current page, fetched by the
   * host in parallel with `content`. See {@link RawSourceInput}.
   *
   * Optional so existing integrations compile unchanged. When
   * absent the editor behaves as it does today (Frontmatter tab
   * shows the post-plugin enriched view, read-only).
   */
  rawSource?: RawSourceInput;
  components: Record<string, unknown>;
  PreviewComponent: ComponentType<PreviewComponentProps>;
  compilePreview: (markdown: string) => Promise<SerializeResult>;
  persist?: (input: {
    route: string;
    markdown: string;
  }) => Promise<AsyncIterable<PersistEvent>> | AsyncIterable<PersistEvent>;
  user?: EditorUser;
  /**
   * When `true` this editor session is for *creating* a
   * brand-new page rather than editing an existing one.
   * Forwarded to `PersistDialog` so the save UI swaps to
   * create-page wording, hides the rename input + diff
   * preview, and includes `isNewPage: true` in the persist
   * payload. Defaults to `false`.
   */
  isNewPage?: boolean;
}

const gutter = () => {
  const gutterEl = document.createElement('div');
  gutterEl.className = styles.gutter;
  return gutterEl;
};

const EditorInner: FC<EditorProps> = ({
  components,
  content,
  rawSource,
  compilePreview,
  persist,
  PreviewComponent,
  isNewPage = false
}) => {
  const previewContent = usePreviewContent();
  const setPreviewContent = useSetPreviewContent();
  const setIsCompiling = useSetIsCompiling();
  const { setError } = useErrorMessage();
  const [saveOpen, setSaveOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: meta, content: markdown } = matter(content);
  const { mode } = useEditorMode();

  const sourceHandleRef = useRef<SourceEditorHandle | null>(null);
  const bridgeRef = useRef<ModeBridgeSnapshot | null>(null);
  const getCurrentMarkdownRef = useRef<() => string>(() => markdown);
  const wysiwygBlockIndexRef = useRef<number>(0);

  /**
   * Authored-frontmatter snapshot getter. Installed by
   * `FrontmatterEditor` when it mounts (i.e. when the user is in
   * frontmatter mode AND the host supplied a raw source). Read
   * by two consumers:
   *
   *   - the save dialog, at open time, to capture the YAML for
   *     the persist payload (returns `undefined` to skip the
   *     `frontmatter` field when the form is in an unsaveable
   *     state);
   *   - `attachFrontmatter` below, on every preview compile, so
   *     the right pane reflects the author's frontmatter edits
   *     live without waiting for a save.
   *
   * Lives on the editor (not the panel) so it survives flips
   * between modes inside a single editing session — the user
   * might edit a tag in frontmatter mode, flip to source to
   * tweak a heading, then save. The dialog needs the most
   * recent frontmatter snapshot regardless of which mode is
   * currently active.
   *
   * The editor clears this back to null on unmount so a stale
   * getter from a previous page can't be called by the dialog
   * after a route change.
   */
  const frontmatterSnapshotRef = useRef<(() => string | undefined) | null>(null);

  /**
   * Cache of the last YAML value the frontmatter form produced,
   * persisted across form mounts. Updated by the parent's
   * `onAuthoredChange` handler below.
   *
   * Why a separate cache and not just `frontmatterSnapshotRef`?
   * The form clears `snapshotRef` on its own unmount as a
   * defence against stale getters surviving a route remount.
   * That's the right behaviour for the save dialog (we'd
   * rather omit the frontmatter field than ship the previous
   * page's bytes), but it would also blank the preview the
   * moment the author flips OUT of the Frontmatter tab — a
   * regression in editor UX. The cache here is owned by the
   * parent and outlives any individual form mount, so
   * `attachFrontmatter` can continue layering the author's
   * edits over `meta` while the user is in another mode
   * within the same editing session.
   *
   * `null` means "no authored YAML has been observed yet" —
   * `attachFrontmatter` falls back to `meta` in that case.
   * Empty string is a legitimate value (the form's "user
   * removed all frontmatter" signal) and parses cleanly to
   * `{}` so the merge below resolves to `meta` alone.
   */
  const lastAuthoredYamlRef = useRef<string | null>(null);

  // Reset the authored-YAML cache when the host hands us a
  // different `content` prop — that signals a fresh editing
  // session (typically a route change) and the previous page's
  // edits should not bleed through. Most hosts also remount
  // `<Editor>` outright on route change (the `key` prop pattern),
  // which makes this effect a no-op; the explicit reset is the
  // safety net for hosts that don't.
  useEffect(() => {
    lastAuthoredYamlRef.current = null;
  }, [content]);

  /**
   * Re-prepend YAML frontmatter to the body before the MDX
   * **preview compile** so `serializeMdxForClient` populates
   * `scope.meta` — without it, expressions like `{meta.title}`
   * render empty in the preview pane.
   *
   * Lexical is seeded with the body alone because the markdown
   * transformers would render the `---` fences as horizontal
   * rules. The preview pipeline gets the frontmatter glued
   * back on here.
   *
   * Which frontmatter
   * -----------------
   * Authors edit the **authored** (pre-plugin) frontmatter in
   * `FrontmatterEditor`. That state lives in the form and is
   * surfaced to outside callers via `frontmatterSnapshotRef`.
   * We layer it on top of `meta` (the post-plugin enriched
   * object the host loaded) so:
   *
   *   - keys the author touched (title, layout, description,
   *     tags, …) reflect their live edits in the preview the
   *     moment they change them;
   *   - keys the author didn't author but plugins injected
   *     (`sidebar`, `breadcrumbs`, `tableOfContents`,
   *     `readingTime`, …) survive so MDX bodies that reference
   *     them keep rendering correctly during the editor session.
   *
   * The author's view "wins" key-by-key, which has the right
   * intuitive behaviour: clearing a field they authored makes
   * it disappear from the preview, even if the post-plugin
   * `meta` had a (now-stale) value for it. Pure-author-removal
   * isn't perfect (the form prunes empty string / empty array
   * rows when serialising, so a deletion becomes a "no such
   * key" in the parsed YAML, which the merge below treats as
   * "keep meta's copy") — but that's strictly less surprising
   * than the previous behaviour of frontmatter edits not
   * updating the preview AT ALL, and gets the editor's UX
   * close enough to what the saved file produces that the
   * remaining gap is invisible in practice.
   *
   * One narrow exception to "author wins": Mosaic ref
   * placeholders. Authors write `data.foo: { $tag: '…' }` or
   * `{ $ref: '…' }`; the CLI's `$TagPlugin` / `$RefPlugin`
   * expand those server-side into arrays of resolved pages,
   * which is what the body iterates over (`.filter(...)
   * .map(...)`). `serializeMdxForClient` doesn't run those
   * plugins, so a literal author-wins merge ships the
   * placeholder to the preview and the first `.filter()` call
   * throws `… is not a function`. `mergeAuthoredFrontmatter`
   * detects `$tag` / `$ref` placeholders and keeps the
   * post-plugin `meta` value at the same path so the preview
   * sees the resolved form. Authored intent is unchanged on
   * disk — the editor saves the placeholder bytes verbatim.
   *
   * If `frontmatterSnapshotRef` returns `undefined` (the form
   * is in an unsaveable state — parse error, empty required
   * field) we fall through to the original `meta` so the
   * preview keeps rendering with the last-known-good
   * frontmatter rather than blanking.
   *
   * NOT used for the save payload — see the dialog wiring
   * below ("Save payload is body-only…") for why.
   *
   * If the file genuinely had no frontmatter AND the author
   * hasn't added any, the `Object.keys(combined).length === 0`
   * short-circuit emits the body unchanged (no spurious
   * `---\n---\n` block).
   *
   * The try/catch defends against `js-yaml` throwing on values
   * it can't represent (cyclic refs, BigInt, functions). On
   * failure we fall back to body-only and warn rather than
   * blanking the preview.
   */
  const attachFrontmatter = useCallback(
    (body: string): string => {
      // Live authored frontmatter (when available) overlays the
      // post-plugin `meta`. The form's `snapshotRef` is the
      // freshest source — it reflects in-progress edits while
      // the form is mounted; once the form unmounts (mode flip),
      // it nulls out and we fall back to `lastAuthoredYamlRef`,
      // a parent-owned cache that survives the form's lifetime.
      // Final fallback is `meta` alone, preserving the original
      // behaviour for hosts that don't supply a raw source at
      // all.
      //
      // The actual overlay is delegated to
      // `mergeAuthoredFrontmatter` — it's a recursive
      // author-wins merge with one narrow carve-out: `$tag` /
      // `$ref` placeholder values in the authored YAML never
      // clobber a resolved (post-plugin) value at the same
      // path in `meta`. See the doc comment on the helper for
      // the full rationale.
      let authored: Record<string, unknown> | undefined;
      const yaml = frontmatterSnapshotRef.current?.() ?? lastAuthoredYamlRef.current ?? undefined;
      if (typeof yaml === 'string') {
        try {
          // Wrap with `---` fences so `matter()` parses the
          // editor's bare YAML the same way it parses an on-disk
          // file. Empty string (the form's "user removed all
          // frontmatter" output) parses cleanly to `{}`.
          const parsed = matter(`---\n${yaml}\n---\n`).data;
          authored = (parsed ?? {}) as Record<string, unknown>;
        } catch (e) {
          // Defensive — the form already gates broken YAML by
          // returning `undefined`, but if a future change loosens
          // that contract we'd rather fall back to meta than
          // throw inside the compile path.
          console.warn(
            '[mosaic-content-editor] Failed to parse authored frontmatter; using post-plugin meta.',
            e
          );
        }
      }
      const combined = authored ? mergeAuthoredFrontmatter(meta, authored) : meta;
      if (!combined || Object.keys(combined).length === 0) return body;
      try {
        return matter.stringify(body, combined);
      } catch (e) {
        console.warn(
          '[mosaic-content-editor] Failed to serialize frontmatter; previewing body only.',
          e
        );
        return body;
      }
    },
    [meta]
  );

  /**
   * Wrapped preview compile — see `attachFrontmatter` for why.
   */
  const compilePreviewWithFrontmatter = useMemo(
    () => (body: string) => compilePreview(attachFrontmatter(body)),
    [compilePreview, attachFrontmatter]
  );

  /**
   * Round-tripped body baseline for the save dialog's diff
   * preview.
   *
   * The on-disk `markdown` (from `gray-matter`) and what
   * Lexical's `$convertToMarkdownString` emits aren't
   * byte-identical even on an unedited document — Lexical
   * normalises emphasis markers (`_x_` → `*x*`), list bullet
   * style, trailing whitespace, link syntax, etc. Diffing the
   * raw on-disk bytes against the live Lexical output therefore
   * showed phantom "+1 / −1" deltas on every freshly-opened
   * page, which (a) was confusing in the "Review changes"
   * accordion and (b) defeated the no-changes-to-submit gate on
   * the Save CTA we added so authors could open the dialog to
   * rename a file without editing the body.
   *
   * Fix: capture the round-tripped baseline ONCE on the first
   * WYSIWYG mount (the bridge installer is the only thing in
   * this tree that has the live editor ref), so subsequent
   * diff comparisons are between Lexical output and Lexical
   * output — apples to apples, no pipeline noise.
   *
   * Started as `null` on purpose: the dialog falls back to the
   * raw on-disk `markdown` until the round-trip is captured, so
   * Source-mode-only sessions (where Lexical never mounts) keep
   * working with the raw baseline. The raw baseline is *also*
   * fine for source mode because the source textarea reads its
   * value back verbatim — no round-trip distortion there.
   */
  const roundTrippedBaselineRef = useRef<string | null>(null);

  /**
   * Baseline YAML the frontmatter editor was seeded with. Owned
   * here (parent) so the value persists across mode flips even
   * when `FrontmatterEditor` is unmounted, and so the dialog can
   * read it without coupling to the panel's React tree. The
   * panel populates it on its first mount.
   */
  const originalFrontmatterYamlRef = useRef<string>('');

  // Reinstall the source-mode getter when the textarea is the
  // active surface. WYSIWYG installs its own getter via
  // WysiwygBridgeInstaller because that closure needs the live
  // Lexical editor reference. The conditional swap keeps stale
  // closures from returning the wrong value across mode flips.
  //
  // Frontmatter mode has no body editor mounted (the viewer is
  // diagnostic-only), so we freeze the getter to return the
  // most-recently-captured body — the bridge snapshot taken
  // when we entered frontmatter mode, or the on-disk markdown
  // if the user opened the editor straight into the
  // Frontmatter tab via the URL. This keeps the save dialog
  // and the post-mode-flip seed correct even though the body
  // can't change while the user is in this tab.
  useEffect(() => {
    if (mode === 'source') {
      getCurrentMarkdownRef.current = () => sourceHandleRef.current?.getValue() ?? markdown;
    } else if (mode === 'frontmatter') {
      const frozen = bridgeRef.current?.markdown ?? markdown;
      getCurrentMarkdownRef.current = () => frozen;
    }
  }, [mode, markdown]);

  /**
   * Called by ModeToggle synchronously BEFORE the URL flip.
   * Snapshots the outgoing mode's value + caret into bridgeRef
   * for the incoming mode to consume on its mount.
   */
  const prepareModeFlip = useCallback(
    (target: EditorMode) => {
      if (target === mode) return;
      if (mode === 'frontmatter') {
        // Frontmatter mode has no body editor, so there's nothing
        // new to capture for the bridge — the body couldn't have
        // changed while the user was in the read-only viewer.
        // Preserve whatever snapshot we already had (set when we
        // entered frontmatter mode); fall back to on-disk markdown
        // if the user opened the editor directly into frontmatter
        // and is now flipping out for the first time.
        if (!bridgeRef.current) {
          bridgeRef.current = { markdown, blockIndex: 0 };
        }
        return;
      }
      if (mode === 'source') {
        const handle = sourceHandleRef.current;
        if (!handle) {
          bridgeRef.current = { markdown, blockIndex: 0 };
          return;
        }
        const value = handle.getValue();
        const blockIndex = blockIndexAtOffset(value, handle.getCaret());
        bridgeRef.current = { markdown: value, blockIndex };
      } else {
        const value = getCurrentMarkdownRef.current?.() ?? markdown;
        bridgeRef.current = {
          markdown: value,
          blockIndex: wysiwygBlockIndexRef.current
        };
      }
    },
    [mode, markdown]
  );

  // What the incoming mode seeds itself with: the bridge
  // snapshot if the user just flipped, otherwise the on-disk
  // markdown.
  const seed: ModeBridgeSnapshot = bridgeRef.current ?? { markdown, blockIndex: 0 };

  const openSave = useCallback(() => setSaveOpen(true), []);
  // Save payload is body-only. The Mosaic workflow reads the
  // original file from disk and re-uses its frontmatter (or, when
  // the editor sends an authored slice, swaps in the new YAML and
  // keeps everything else). Sending the post-plugin enriched
  // frontmatter back would re-persist regenerated-each-build data
  // (`sidebar`, `breadcrumbs`, `navigation`, …) into the source
  // file, polluting the repo and making the PR diff unreadable.
  // Body-only also keeps the "Review changes" diff focused on
  // what the author actually edited.
  const getCurrentMarkdown = useCallback(() => getCurrentMarkdownRef.current(), []);

  /**
   * Stable callback the save dialog calls at open time. Delegates
   * to whatever getter `FrontmatterEditor` last installed, or
   * returns `undefined` when no editor is mounted / the form is in
   * a parse-error state. The dialog treats `undefined` as "omit
   * the `frontmatter` field" so the workflow keeps its on-disk
   * fallback.
   */
  const getCurrentAuthoredFrontmatter = useCallback(
    () => frontmatterSnapshotRef.current?.() ?? undefined,
    []
  );

  // -------------------------------------------------------------
  // Frontmatter-driven preview refresh
  // -------------------------------------------------------------
  //
  // The Lexical preview plugin (and the source-mode debounced
  // compile) only fire when the BODY changes. A pure
  // frontmatter edit — the case where the user is in the
  // Frontmatter tab tweaking `title` or `tags` — doesn't trip
  // either, so before this hook landed the preview pane sat
  // stale until the next body keystroke. The fix is to drive a
  // compile from the frontmatter editor too, using the same
  // pipeline (`compilePreviewWithFrontmatter` reads live
  // frontmatter via `frontmatterSnapshotRef`, so a re-compile
  // with the current body picks the author's edits up
  // automatically).
  //
  // Shared sequence ref
  // -------------------
  // PreviewPlugin and SourceEditor each own their own seq id to
  // drop out-of-order compile responses. A frontmatter-driven
  // compile runs OUTSIDE both of those scopes, so out-of-order
  // racing between (e.g.) a body-debounce-fired compile and a
  // frontmatter-fired compile could surface as the older
  // response clobbering the newer preview. We can't share refs
  // across the existing PreviewPlugin / SourceEditor boundary
  // without refactoring both — but we CAN serialise everything
  // the frontmatter editor fires through one local id so that,
  // at minimum, the user typing in the frontmatter form sees
  // their LAST keystroke's preview rather than an earlier one.
  // The cross-mode race (frontmatter-fired compile while a
  // body-fired one is in flight) is bounded: the body editors
  // are unmounted in frontmatter mode, so there's no concurrent
  // source of compiles.
  const frontmatterCompileSeqRef = useRef(0);

  const recompilePreviewForFrontmatter = useCallback(async () => {
    const seq = ++frontmatterCompileSeqRef.current;
    setIsCompiling(true);
    try {
      const body = getCurrentMarkdownRef.current();
      const source = await compilePreviewWithFrontmatter(body);
      // Drop the result if a newer compile has been issued —
      // its eventual response should win.
      if (seq !== frontmatterCompileSeqRef.current) return;
      if ('error' in source && source.error) {
        // Surface the compile error immediately. We deliberately
        // skip PreviewPlugin's "grace window" here because
        // frontmatter edits aren't keystroke-frequent the same
        // way prose typing is — each edit is a discrete commit
        // (a row change, a YAML island save), so the user
        // expects immediate feedback if the result is broken.
        setError(formatMdxError(source.error));
      } else {
        setError(undefined);
        setPreviewContent(source);
      }
    } catch (e) {
      if (seq !== frontmatterCompileSeqRef.current) return;
      setError(formatMdxError(e));
    } finally {
      if (seq === frontmatterCompileSeqRef.current) setIsCompiling(false);
    }
  }, [compilePreviewWithFrontmatter, setError, setIsCompiling, setPreviewContent]);

  // Debounce so a fast typist in a string field doesn't fire a
  // compile per keystroke. 250 ms matches PreviewPlugin /
  // SourceEditor so the preview rhythm feels uniform across
  // modes; `maxWait: 500` guarantees the preview can't lag
  // arbitrarily behind continuous typing.
  const debouncedRecompileForFrontmatter = useMemo(
    () => debounce(recompilePreviewForFrontmatter, 250, { maxWait: 500 }),
    [recompilePreviewForFrontmatter]
  );

  // Cancel pending recompiles on unmount so a stale response
  // doesn't setState on an unmounted tree.
  useEffect(
    () => () => {
      debouncedRecompileForFrontmatter.cancel();
    },
    [debouncedRecompileForFrontmatter]
  );

  // Stable wrapper exposed to `FrontmatterEditor` via the panel.
  // Captures the current YAML into `lastAuthoredYamlRef` so the
  // preview keeps the author's edits even after they flip out of
  // frontmatter mode (the form clears its `snapshotRef` on
  // unmount; the cache here outlives that), then schedules a
  // debounced recompile.
  //
  // The wrapper identity stays stable across renders so the form
  // doesn't re-debounce on every parent re-render.
  const requestPreviewRecompileFromFrontmatter = useCallback(() => {
    // `?? null` keeps the cache typed as "string | null" — an
    // unsaveable form state (parse error, empty required field)
    // returns `undefined` from the snapshot getter, which we
    // treat as "don't update the cache" so the preview keeps
    // showing the last good edit instead of blanking.
    const yaml = frontmatterSnapshotRef.current?.();
    if (typeof yaml === 'string') {
      lastAuthoredYamlRef.current = yaml;
    }
    debouncedRecompileForFrontmatter();
  }, [debouncedRecompileForFrontmatter]);

  const bridgeValue = useMemo<ModeBridgeContextValue>(
    () => ({ prepareModeFlip }),
    [prepareModeFlip]
  );

  return (
    <ModeBridgeProvider value={bridgeValue}>
      <FormattingToolbarSlotProvider>
        <div className={styles.root} data-mosaic-editor-root="true">
          <div className={styles.toolbarContainer}>
            <Toolbar onSave={openSave} />
            <PersistDialog
              open={saveOpen}
              onOpenChange={setSaveOpen}
              meta={meta}
              // Prefer the round-tripped baseline (captured on
              // the first WYSIWYG mount) so the diff compares
              // Lexical-output against Lexical-output and isn't
              // polluted by pipeline noise (emphasis style, list
              // bullets, trailing whitespace). The raw on-disk
              // markdown is the fallback for source-only sessions
              // where Lexical never mounts — the textarea reads
              // bytes back verbatim, so no round-trip distortion
              // there either.
              originalMarkdown={roundTrippedBaselineRef.current ?? markdown}
              getCurrentMarkdown={getCurrentMarkdown}
              // Authored-frontmatter snapshot. Only meaningful
              // when the user opened the Frontmatter tab against
              // a raw source. The dialog decides "omit if
              // unchanged / undefined"; the workflow's "no field
              // → keep on-disk bytes" fallback covers everything
              // else.
              getCurrentAuthoredFrontmatter={getCurrentAuthoredFrontmatter}
              originalAuthoredFrontmatter={originalFrontmatterYamlRef.current}
              persist={persist}
              isNewPage={isNewPage}
            />
            <ShortcutHelpDialog />
            <StatusBanner />
            <RouteNoticeBanner />
          </div>
          <div className={styles.editorRoot}>
            {/*
              `react-split` measures the container width imperatively
              at mount time and writes inline `width: calc(...)`
              styles on each pane. On a fresh editor session — and
              particularly on the new-page flow, where the editor
              mounts on a route that didn't exist a moment ago
              alongside the create-mode chrome (frontmatter banner,
              status banner, save-state pill) all settling in — the
              container can be measured before its final width is
              known, baking in unbalanced widths that visibly snap
              to 50/50 a frame later. The result is a brief, jarring
              "jump" the first time the editor appears.

              Defer `<Split>` mount by one paint via `splitReady`
              so react-split measures against a fully laid-out
              parent. Until then we render a CSS-only 50/50
              fallback (`flex: 1` on each pane via
              `styles.splitterFallback`), which is what the user
              sees during that first frame anyway — same visual
              result, no measurement race.
            */}
            <SplitContainer isNewPage={isNewPage}>
              <ScrollableSection className={styles.focused} ref={containerRef}>
                {mode === 'wysiwyg' ? (
                  <WysiwygShell
                    key={`wys-${seed.markdown.length}-${seed.blockIndex}`}
                    seed={seed}
                    compilePreview={compilePreviewWithFrontmatter}
                    getCurrentMarkdownRef={getCurrentMarkdownRef}
                    wysiwygBlockIndexRef={wysiwygBlockIndexRef}
                    bridgeRef={bridgeRef}
                    roundTrippedBaselineRef={roundTrippedBaselineRef}
                  />
                ) : mode === 'source' ? (
                  <SourceEditor
                    ref={sourceHandleRef}
                    initialValue={seed.markdown}
                    initialCaret={blockStartOffset(seed.markdown, seed.blockIndex)}
                    compilePreview={compilePreviewWithFrontmatter}
                  />
                ) : (
                  <FrontmatterPanel
                    meta={meta}
                    rawSource={rawSource}
                    snapshotRef={frontmatterSnapshotRef}
                    originalYamlRef={originalFrontmatterYamlRef}
                    onAuthoredChange={requestPreviewRecompileFromFrontmatter}
                  />
                )}
              </ScrollableSection>
              <ScrollableSection>
                <PreviewComponent source={previewContent} meta={meta} components={components} />
              </ScrollableSection>
            </SplitContainer>
            {/*
            Mode-agnostic plugins — only consume EditorContext slices
            and don't touch Lexical, so they keep working when the
            composer is unmounted in source mode.
          */}
            <LeaveGuardPlugin />
            <KeyboardShortcutsPlugin onSave={openSave} />
          </div>
        </div>
      </FormattingToolbarSlotProvider>
    </ModeBridgeProvider>
  );
};

/**
 * Two-phase splitter mount. Phase 1: a CSS-only 50/50 layout
 * renders immediately (no JS measurement, no risk of
 * mis-sized panes). Phase 2: after one paint we swap in
 * `<Split>`, which by then measures against a fully laid-out
 * container.
 *
 * Why two phases instead of just `<Split sizes={[50, 50]}>`?
 * react-split sets pane widths imperatively via
 * `getBoundingClientRect()` at mount time. When the editor
 * mounts mid-transition (the new-page flow goes from view → an
 * RSC payload that didn't exist a moment ago → editor chrome
 * settling in), that measurement can race the parent's final
 * layout. The result is a visible jump from the racey-measured
 * widths to the corrected 50/50 a frame later. Deferring the
 * `<Split>` mount eliminates that race; the first paint is
 * already 50/50, and react-split takes over silently.
 *
 * `requestAnimationFrame` (not `useEffect` alone) so we run
 * AFTER the browser's first paint — `useEffect` fires after
 * commit but before paint in some scheduler modes, which would
 * defeat the point. Falls back to a `setTimeout(0)` if rAF
 * isn't available (SSR shouldn't reach this branch since the
 * component is wrapped in a client-only ancestor, but the
 * defensive shim is two lines).
 *
 * Once `splitReady` flips true it stays true for the lifetime
 * of the component — we don't need to keep re-checking, and
 * keying on `isNewPage` would re-trigger the dance every time
 * the user toggles modes (it doesn't change mid-session, but
 * the prop is in the dep array for future-proofing the
 * comment).
 */
interface SplitContainerProps {
  isNewPage: boolean;
  children: React.ReactNode;
}

const SplitContainer: FC<SplitContainerProps> = ({ isNewPage, children }) => {
  const [splitReady, setSplitReady] = useState(false);

  useEffect(() => {
    const raf =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(() => setSplitReady(true))
        : (setTimeout(() => setSplitReady(true), 0) as unknown as number);
    return () => {
      if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(raf);
      else clearTimeout(raf);
    };
  }, []);

  // Coerce children into the two-element tuple Split expects.
  // The caller always passes exactly two `<ScrollableSection>`
  // children, but TypeScript can't see that through `ReactNode`,
  // and react-split's runtime would mis-render anything else.
  const childArray = Array.isArray(children) ? children : [children];

  if (!splitReady) {
    return (
      <div className={styles.splitterFallback}>
        {childArray.map((child, i) => (
          // Stable index keys are fine — the order never changes
          // and the fallback only renders for a single frame
          // before being swapped out.

          <div key={i} className={styles.splitterFallbackPane}>
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Split
      // Keying on `isNewPage` ensures a fresh react-split mount
      // for the create branch — belt-and-braces alongside the
      // two-phase mount above. If the new-page chrome ever
      // settles on a SECOND frame (rare but possible with
      // streaming RSC), the key resets react-split's measurement
      // on the next render after `isNewPage` is observed.
      key={isNewPage ? 'new-page' : 'edit'}
      className={styles.splitter}
      cursor="col-resize"
      direction="horizontal"
      dragInterval={1}
      expandToMin={false}
      gutter={gutter}
      gutterAlign="center"
      minSize={100}
      sizes={[50, 50]}
      snapOffset={30}
    >
      {children}
    </Split>
  );
};

interface WysiwygShellProps {
  seed: ModeBridgeSnapshot;
  compilePreview: EditorProps['compilePreview'];
  getCurrentMarkdownRef: React.RefObject<() => string>;
  wysiwygBlockIndexRef: React.RefObject<number>;
  bridgeRef: React.RefObject<ModeBridgeSnapshot | null>;
  /**
   * Round-tripped baseline target. The bridge installer writes
   * to it once on first WYSIWYG mount so the save dialog can
   * diff Lexical-output against Lexical-output (eliminating
   * pipeline-noise phantom diffs).
   */
  roundTrippedBaselineRef: React.RefObject<string | null>;
}

const WysiwygShell: FC<WysiwygShellProps> = ({
  seed,
  compilePreview,
  getCurrentMarkdownRef,
  wysiwygBlockIndexRef,
  bridgeRef,
  roundTrippedBaselineRef
}) => (
  <LexicalComposer
    initialConfig={{
      ...initialConfig,
      editorState: () => $convertFromMarkdownString(seed.markdown, transformers)
    }}
  >
    <ContentEditor />
    <HistoryPlugin />
    <ListPlugin />
    {/*
      Explicit props rather than relying on @lexical/react defaults:
        - `hasCellMerge`: required for the merge / unmerge action
          menu to function. Defaults to true today but pinning it
          documents intent and survives an upstream default flip.
        - `hasCellBackgroundColor={false}`: we don't surface per-
          cell background styling and the markdown serializer
          can't round-trip it anyway, so opting out keeps the
          editor state lean.
        - `hasTabHandler`: makes Tab / Shift+Tab move between
          cells, which is the standard table editing affordance.
    */}
    <TablePlugin hasCellMerge hasCellBackgroundColor={false} hasTabHandler />
    <LinkPlugin />
    <MarkdownShortcutPlugin transformers={transformers} />
    <PreviewPlugin compilePreview={compilePreview} />
    <DirtyTrackerPlugin />
    <ErrorHighlightPlugin />
    {/*
      Mounts the three command-handler register helpers
      (`registerHorizontalRule`, `registerMarkdownImage`,
      `registerMarkdownLink`) through `mergeRegister`, giving a
      single `useEffect` whose cleanup tears all three down in
      registration order. Matches upstream Lexical's pattern
      (e.g. `LexicalClearEditorPlugin`).
    */}
    <CommandHandlerRegistrations />
    {/*
      Link-insert dialog. Mounted as a direct composer child so
      its `useLexicalComposerContext()` resolves to the same
      editor it dispatches `INSERT_MARKDOWN_LINK_COMMAND` against.
    */}
    <InsertLinkDialog />
    <LinkEditor />
    <FloatingToolbarPlugin />
    <TableActionMenuPlugin />
    {/*
      Lexical-coupled toolbar half. Lives inside the composer so
      its undo/redo + format/insert children can use
      `useLexicalComposerContext`; portaled by
      `<FormattingToolbarPortal>` into the chrome toolbar's slot
      so it appears on the same visual row.
    */}
    <WysiwygFormattingTooltrays />
    <WysiwygBridgeInstaller
      seed={seed}
      getCurrentMarkdownRef={getCurrentMarkdownRef}
      wysiwygBlockIndexRef={wysiwygBlockIndexRef}
      bridgeRef={bridgeRef}
      roundTrippedBaselineRef={roundTrippedBaselineRef}
    />
  </LexicalComposer>
);

/**
 * Mounts the three command-handler register helpers
 * (`registerHorizontalRule`, `registerMarkdownImage`,
 * `registerMarkdownLink`) against the composer's editor.
 *
 * A child component (rather than a `useEffect` in `WysiwygShell`)
 * because `useLexicalComposerContext()` is only resolvable inside
 * `<LexicalComposer>`, and `WysiwygShell` is a presentational
 * arrow component with no hook calls. Same trick as
 * `<WysiwygBridgeInstaller />`.
 *
 * `mergeRegister` gives a single `useEffect` whose cleanup tears
 * the three down in LIFO order; the dep array stays `[editor]`
 * because the helpers are module-scoped imports.
 *
 * Adding a fourth command-handler extension here is a one-line
 * change: import the helper, call it inside `mergeRegister(...)`.
 */
const CommandHandlerRegistrations: FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      mergeRegister(
        registerHorizontalRule(editor),
        registerMarkdownImage(editor),
        registerMarkdownLink(editor)
      ),
    [editor]
  );

  return null;
};

interface WysiwygBridgeInstallerProps {
  seed: ModeBridgeSnapshot;
  getCurrentMarkdownRef: React.RefObject<() => string>;
  wysiwygBlockIndexRef: React.RefObject<number>;
  bridgeRef: React.RefObject<ModeBridgeSnapshot | null>;
  roundTrippedBaselineRef: React.RefObject<string | null>;
}

/**
 * Three small responsibilities:
 *
 *  1. Install the `getCurrentMarkdownRef` callback so the save
 *     dialog can pull the current Lexical state from outside
 *     the composer.
 *  2. Place the caret at the seeded `blockIndex` after mount;
 *     clear bridgeRef so a re-render of the parent doesn't
 *     re-apply the same seed twice.
 *  3. Track the current block index of the WYSIWYG selection so
 *     a flip OUT of WYSIWYG can read the most recent value.
 *  4. On the very first WYSIWYG mount of an editor session,
 *     snapshot the round-tripped baseline — `$convertToMarkdownString`
 *     against the freshly-seeded editor state — so the save
 *     dialog can diff like-for-like. Guarded by an
 *     "only write when empty" check so subsequent mode-flip
 *     re-mounts don't overwrite the baseline with the user's
 *     in-progress edits.
 */
const WysiwygBridgeInstaller: FC<WysiwygBridgeInstallerProps> = ({
  seed,
  getCurrentMarkdownRef,
  wysiwygBlockIndexRef,
  bridgeRef,
  roundTrippedBaselineRef
}) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    getCurrentMarkdownRef.current = () => {
      let value = '';
      editor.getEditorState().read(() => {
        value = $convertToMarkdownString(transformers);
      });
      return value;
    };
    // Capture the round-tripped baseline once. We do it inside
    // the same effect because we already need the editor ref
    // here; running it as the next effect-tick (after the
    // installer mounts) means the seeded state is fully
    // applied. The `null` guard makes subsequent re-mounts
    // (from mode flips, where the user has potentially edited
    // since first mount) no-ops — first WYSIWYG mount wins
    // for the lifetime of the editor session.
    if (roundTrippedBaselineRef.current === null) {
      let baseline = '';
      editor.getEditorState().read(() => {
        baseline = $convertToMarkdownString(transformers);
      });
      roundTrippedBaselineRef.current = baseline;
    }
  }, [editor, getCurrentMarkdownRef, roundTrippedBaselineRef]);

  useEffect(() => {
    if (seed.blockIndex > 0) {
      editor.update(() => {
        const root = $getRoot();
        const blocks = root.getChildren();
        const target = blocks[Math.min(seed.blockIndex, blocks.length - 1)];
        if (!target) return;
        type Selectable = {
          selectStart?: () => void;
          selectEnd?: () => void;
        };
        const node = target as unknown as Selectable;
        if (node.selectStart) node.selectStart();
        else if (node.selectEnd) node.selectEnd();
      });
    }
    bridgeRef.current = null;
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(() => {
      editor.getEditorState().read(() => {
        const sel = $getSelection();
        if (!$isRangeSelection(sel)) return;
        const top = sel.anchor.getNode().getTopLevelElement();
        if (!top) return;
        const blocks = $getRoot().getChildren();
        const index = blocks.findIndex(b => b.getKey() === top.getKey());
        if (index >= 0) wysiwygBlockIndexRef.current = index;
      });
    });
  }, [editor, wysiwygBlockIndexRef]);

  return null;
};

const Editor: FC<EditorProps> = props => (
  <EditorProvider initialUser={props.user}>
    <EditorInner {...props} />
  </EditorProvider>
);

export default Editor;
