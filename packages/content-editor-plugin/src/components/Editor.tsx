'use client';

/**
 * Phase 10 — Editor shell that owns mode switching.
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
 *      different rendering strategies isn't worth the
 *      complexity for a docs editor where authors switch modes
 *      between edits, not mid-word. Block-level preservation
 *      satisfies the Phase-10 exit gate ("toggle preserves
 *      cursor position") in the way authors actually
 *      experience it.
 */

import { ComponentType, FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import matter from 'gray-matter';
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
import { EditorProvider, usePreviewContent, type EditorUser } from '../EditorContext';
import { PreviewPlugin } from '../plugins/PreviewPlugin';
import { DirtyTrackerPlugin } from '../plugins/DirtyTrackerPlugin';
import { ErrorHighlightPlugin } from '../plugins/ErrorHighlightPlugin';
import styles from './Editor.css';
import Toolbar from './Toolbar/Toolbar';
import theme from '../theme';
import { PersistDialog, type PersistEvent } from './PersistEditDialog';
import StatusBanner from './StatusBanner';
import { ShortcutHelpDialog } from './ShortcutHelpDialog';
// Phase 0d: the three command-only React plugins
// (`MarkdownImagePlugin`, `MarkdownLinkPlugin`,
// `HorizontalRulePlugin`) and the generic `<ExtensionMounter>`
// bridge are gone. We now call upstream Lexical's idiomatic
// per-helper pattern (`registerClearEditor`-style) directly from
// the small `<CommandHandlerRegistrations />` child below, which
// pipes them through `mergeRegister` so a single `useEffect`
// returns one combined unregister. The link plugin's JSX surface
// (`<InsertLinkDialog />`) sits next to it as a direct composer
// child — same composer subtree, so its `useLexicalComposerContext()`
// still resolves to the same editor it dispatches against.
import { InsertLinkDialog } from './Toolbar/InsertLink';
import { registerHorizontalRule, registerMarkdownImage, registerMarkdownLink } from '../extensions';
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

export interface EditorProps {
  content: string;
  components: Record<string, unknown>;
  PreviewComponent: ComponentType<PreviewComponentProps>;
  compilePreview: (markdown: string) => Promise<SerializeResult>;
  persist?: (input: {
    route: string;
    markdown: string;
  }) => Promise<AsyncIterable<PersistEvent>> | AsyncIterable<PersistEvent>;
  user?: EditorUser;
}

const gutter = () => {
  const gutterEl = document.createElement('div');
  gutterEl.className = styles.gutter;
  return gutterEl;
};

/**
 * Find the start byte-offset of the Nth top-level block in a
 * markdown body. A "top-level block" is anything separated by a
 * blank line.
 */
function blockStartOffset(markdown: string, blockIndex: number): number {
  if (blockIndex <= 0) return 0;
  let seen = 0;
  let i = 0;
  while (i < markdown.length && seen < blockIndex) {
    if (markdown.charCodeAt(i) === 10) {
      let j = i + 1;
      while (j < markdown.length && markdown.charCodeAt(j) === 10) j += 1;
      if (j - i >= 2) {
        seen += 1;
        i = j;
        continue;
      }
    }
    i += 1;
  }
  return i;
}

/**
 * Inverse of blockStartOffset — count which top-level block a
 * caret at byte-offset `caret` falls in.
 */
function blockIndexAtOffset(markdown: string, caret: number): number {
  if (caret <= 0) return 0;
  let blocks = 0;
  let i = 0;
  while (i < markdown.length && i < caret) {
    if (markdown.charCodeAt(i) === 10) {
      let j = i + 1;
      while (j < markdown.length && markdown.charCodeAt(j) === 10) j += 1;
      if (j - i >= 2) {
        blocks += 1;
        i = j;
        continue;
      }
    }
    i += 1;
  }
  return blocks;
}

const EditorInner: FC<EditorProps> = ({
  components,
  content,
  compilePreview,
  persist,
  PreviewComponent
}) => {
  const previewContent = usePreviewContent();
  const [saveOpen, setSaveOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { data: meta, content: markdown } = matter(content);
  const { mode } = useEditorMode();

  const sourceHandleRef = useRef<SourceEditorHandle | null>(null);
  const bridgeRef = useRef<ModeBridgeSnapshot | null>(null);
  const getCurrentMarkdownRef = useRef<() => string>(() => markdown);
  const wysiwygBlockIndexRef = useRef<number>(0);

  // Reinstall the source-mode getter when the textarea is the
  // active surface. WYSIWYG installs its own getter via
  // WysiwygBridgeInstaller because that closure needs the live
  // Lexical editor reference. The conditional swap keeps stale
  // closures from returning the wrong value across mode flips.
  useEffect(() => {
    if (mode === 'source') {
      getCurrentMarkdownRef.current = () => sourceHandleRef.current?.getValue() ?? markdown;
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
  const getCurrentMarkdown = useCallback(() => getCurrentMarkdownRef.current(), []);

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
              originalMarkdown={markdown}
              getCurrentMarkdown={getCurrentMarkdown}
              persist={persist}
            />
            <ShortcutHelpDialog />
            <StatusBanner />
          </div>
          <div className={styles.editorRoot}>
            <Split
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
              <ScrollableSection className={styles.focused} ref={containerRef}>
                {mode === 'wysiwyg' ? (
                  <WysiwygShell
                    key={`wys-${seed.markdown.length}-${seed.blockIndex}`}
                    seed={seed}
                    compilePreview={compilePreview}
                    getCurrentMarkdownRef={getCurrentMarkdownRef}
                    wysiwygBlockIndexRef={wysiwygBlockIndexRef}
                    bridgeRef={bridgeRef}
                  />
                ) : (
                  <SourceEditor
                    ref={sourceHandleRef}
                    initialValue={seed.markdown}
                    initialCaret={blockStartOffset(seed.markdown, seed.blockIndex)}
                    compilePreview={compilePreview}
                  />
                )}
              </ScrollableSection>
              <ScrollableSection>
                <PreviewComponent source={previewContent} meta={meta} components={components} />
              </ScrollableSection>
            </Split>
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

interface WysiwygShellProps {
  seed: ModeBridgeSnapshot;
  compilePreview: EditorProps['compilePreview'];
  getCurrentMarkdownRef: React.RefObject<() => string>;
  wysiwygBlockIndexRef: React.RefObject<number>;
  bridgeRef: React.RefObject<ModeBridgeSnapshot | null>;
}

const WysiwygShell: FC<WysiwygShellProps> = ({
  seed,
  compilePreview,
  getCurrentMarkdownRef,
  wysiwygBlockIndexRef,
  bridgeRef
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
    <TablePlugin />
    <LinkPlugin />
    <MarkdownShortcutPlugin transformers={transformers} />
    <PreviewPlugin compilePreview={compilePreview} />
    <DirtyTrackerPlugin />
    <ErrorHighlightPlugin />
    {/*
      Phase 0d: replaces the former `<MarkdownImagePlugin />`,
      `<MarkdownLinkPlugin />`, `<HorizontalRulePlugin />`, and
      (transitionally) `<ExtensionMounter extensions={ROOT_EXTENSIONS} />`
      mounts. `<CommandHandlerRegistrations />` calls the three
      standalone `register*(editor)` helpers from
      `src/extensions/` through `mergeRegister`, giving us a single
      `useEffect` whose cleanup tears all three down in registration
      order. Matches upstream Lexical's pattern (e.g.
      `LexicalClearEditorPlugin`).
    */}
    <CommandHandlerRegistrations />
    {/*
      Phase 0b: the link dialog used to be rendered by
      `<MarkdownLinkPlugin />`. With that wrapper gone, the dialog
      is mounted directly here — same composer subtree, so its
      `useLexicalComposerContext()` call still resolves to the
      same editor it dispatches `INSERT_MARKDOWN_LINK_COMMAND`
      against.
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
    />
  </LexicalComposer>
);

/**
 * Phase 0d — mounts the three command-handler register helpers
 * from `src/extensions/` against the composer's editor.
 *
 * Why a child component rather than inlining a `useEffect` into
 * `WysiwygShell`: `WysiwygShell` is an arrow-returning-JSX
 * presentational component with no hook calls, and the
 * `useLexicalComposerContext()` we need is only resolvable
 * *inside* `<LexicalComposer>`. A tiny child component is the
 * smallest hammer for both constraints, and matches the existing
 * pattern in this file (`<WysiwygBridgeInstaller />` does the
 * same trick).
 *
 * Why `mergeRegister` rather than three separate effects:
 *
 *   - Single `useEffect` means a single cleanup, which fires in
 *     LIFO order per `mergeRegister` semantics. Three commands
 *     register against the same editor; tearing them down in
 *     reverse-of-registration order is the safe default.
 *
 *   - The dep array stays `[editor]` only — the three helper
 *     identities are module-scoped imports, so they never change
 *     and don't belong in deps. Lint rules that flag missing deps
 *     won't complain because the helpers aren't reactive values.
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
 */
const WysiwygBridgeInstaller: FC<WysiwygBridgeInstallerProps> = ({
  seed,
  getCurrentMarkdownRef,
  wysiwygBlockIndexRef,
  bridgeRef
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
  }, [editor, getCurrentMarkdownRef]);

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
