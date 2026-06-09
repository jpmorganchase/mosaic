'use client';

/**
 * Lexical plugin that compiles the current editor content via a host-
 * supplied Server Action (debounced on keystrokes) and stores the
 * result in the editor context for the preview pane to render.
 *
 * The action is invoked inside `useTransition` so the resulting state
 * updates are non-urgent — typing stays responsive even when a slow
 * compile is in flight.
 *
 * Error surfacing is intentionally lazier than preview compilation:
 * the preview pane updates ~250ms after the last keystroke (snappy
 * feedback), but the red error banner / squiggle is held back until
 * the markdown has been *idle* for a bit longer (see ERROR_GRACE_MS).
 * Without that delay, partial input mid-component (`<C`, `<Card `,
 * `<Card prop=`) flashes red on every keystroke pause and trains
 * users to ignore the banner. Successful compiles always clear errors
 * immediately — good news is urgent.
 */
import { $convertToMarkdownString } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { debounce } from 'lodash-es';
import { useEffect, useMemo, useRef, useTransition } from 'react';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import transformers from '../transformers';
import {
  useErrorMessage,
  useLineMap,
  useSetIsCompiling,
  useSetPreviewContent
} from '../EditorContext';
import { $buildLineMap } from '../utils/buildLineMap';
import { formatMdxError } from '../utils/formatMdxError';

/**
 * How long the markdown must stay unchanged after a failing compile
 * before we show the error UI. Picked to comfortably exceed both the
 * preview-compile debounce (250 ms) and a typical author's pause
 * between keystrokes within a single word, so red doesn't flash mid-
 * keystroke for transiently-broken JSX like `<Card`.
 */
const ERROR_GRACE_MS = 800;

export interface PreviewPluginProps {
  /**
   * Server Action that compiles MDX source to a `SerializeResult`.
   * Passed in (rather than imported) so the plugin stays decoupled
   * from any specific Next app.
   */
  compilePreview: (markdown: string) => Promise<SerializeResult>;
}

export const PreviewPlugin = ({ compilePreview }: PreviewPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const setPreviewContent = useSetPreviewContent();
  const setIsCompiling = useSetIsCompiling();
  const { error, setError } = useErrorMessage();
  const { setLineMap } = useLineMap();
  const [, startTransition] = useTransition();
  const didSeedRef = useRef(false);
  // Monotonic id assigned to each in-flight compile. Out-of-order
  // responses (debounced typing fires N requests, the network /
  // server returns them in any order) would otherwise let a stale
  // failing compile resurrect itself over a fresh successful one —
  // the visible symptom is that fixing the markdown leaves the old
  // error / red squiggle stuck on screen. The latest request id wins;
  // earlier responses no-op.
  const compileSeqRef = useRef(0);
  // Pending error waiting out the grace window before being shown.
  // We keep a ref (not state) because writes happen inside async
  // callbacks where a render would just queue a render-during-render.
  // `pendingErrorRef` holds the not-yet-displayed error; the timer
  // promotes it to the visible context after ERROR_GRACE_MS of
  // markdown stillness.
  const pendingErrorRef = useRef<ReturnType<typeof formatMdxError> | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest error value — read inside callbacks without re-subscribing
  // them when the error changes. (Plain `error` in deps would
  // recreate `onChange` on every keystroke that surfaced an error.)
  const currentErrorRef = useRef<typeof error>(error);
  useEffect(() => {
    currentErrorRef.current = error;
  }, [error]);

  const cancelPendingError = () => {
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
    pendingErrorRef.current = null;
  };

  // Queue an error to surface after `ERROR_GRACE_MS` of markdown
  // stillness. Resets any in-flight grace timer so the latest
  // failure governs the wait. The visible error context is left
  // untouched until the timer fires — half-typed JSX (`<Card`,
  // `<Card prop=`) doesn't paint red on every keystroke pause.
  const queueErrorAfterGrace = (formatted: ReturnType<typeof formatMdxError>) => {
    pendingErrorRef.current = formatted;
    if (pendingTimerRef.current !== null) {
      clearTimeout(pendingTimerRef.current);
    }
    pendingTimerRef.current = setTimeout(() => {
      pendingTimerRef.current = null;
      const queued = pendingErrorRef.current;
      pendingErrorRef.current = null;
      if (queued) setError(queued);
    }, ERROR_GRACE_MS);
  };

  // Single compile pipeline used by both the initial seed and the
  // debounced onChange path. Building the line map alongside the
  // markdown (inside the same `editor.read()`) guarantees they
  // describe the same Lexical state snapshot — without this, a fast
  // typist could race the map against the markdown and we'd highlight
  // the wrong block.
  const runCompile = useMemo(
    () => (markdown: string) => {
      const seq = ++compileSeqRef.current;
      setIsCompiling(true);
      startTransition(async () => {
        try {
          const source = await compilePreview(markdown);
          // Drop the result if a newer compile has been issued —
          // its eventual response is what should drive UI state.
          if (seq !== compileSeqRef.current) return;
          if ('error' in source && source.error) {
            queueErrorAfterGrace(formatMdxError(source.error));
          } else {
            // Successful compile — show the new preview and tear down
            // any pending error timer (good news cancels bad news).
            cancelPendingError();
            setError(undefined);
            setPreviewContent(source);
          }
        } catch (e) {
          if (seq !== compileSeqRef.current) return;
          // Thrown errors (server-action failures, network issues)
          // go through the same grace window as compile errors so a
          // dropped request mid-keystroke doesn't flash red either.
          queueErrorAfterGrace(formatMdxError(e));
        } finally {
          // Only the latest in-flight compile owns the busy flag —
          // an out-of-order earlier response should not flip it back
          // off while a newer compile is still running.
          if (seq === compileSeqRef.current) setIsCompiling(false);
        }
      });
    },
    [compilePreview, setError, setIsCompiling, setPreviewContent]
  );

  // Snapshot helper: serialize the current state to markdown AND build
  // the line map from the same `editor.read()` block. Returns `null`
  // when the editor is empty (nothing to compile).
  const snapshot = useMemo(
    () => (): string | null => {
      let markdown: string | null = null;
      editor.getEditorState().read(() => {
        const md = $convertToMarkdownString(transformers);
        if (!md) return;
        const map = $buildLineMap(transformers, editor);
        // Falsy map means the per-block reassembly diverged from the
        // canonical output; we still send the markdown to the
        // compiler but skip highlighting (banner remains accurate).
        setLineMap(map);
        markdown = md;
      });
      return markdown;
    },
    [editor, setLineMap]
  );

  // `debounce` returns a new function on every render; memoise it so
  // the leading/trailing timer state is preserved across keystrokes
  // and `OnChangePlugin` doesn't re-subscribe each render.
  const handleContentChange = useMemo(
    () => debounce(runCompile, 250, { maxWait: 500 }),
    [runCompile]
  );

  // Cancel any pending debounced call (and any pending error timer)
  // on unmount so a stale compile doesn't fire setState on an
  // unmounted tree.
  useEffect(
    () => () => {
      handleContentChange.cancel();
      cancelPendingError();
    },
    [handleContentChange]
  );

  // Seed the preview once on mount by compiling the editor's initial
  // content. Without this the preview pane stays blank until the user
  // types — confusing for read-only previews and for users who open
  // the editor just to inspect the rendered output.
  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    const markdown = snapshot();
    if (markdown) runCompile(markdown);
  }, [snapshot, runCompile]);

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const md = $convertToMarkdownString(transformers);
      if (!md) return;
      // Update the map synchronously from the same state read; the
      // compile itself can be debounced because that's just the
      // network call, but the map MUST move in lockstep with the
      // editor so highlights point at the right node.
      const map = $buildLineMap(transformers, editor);
      setLineMap(map);
      // Typing should always reset the grace window: a queued error
      // from the previous markdown is no longer relevant. We also
      // optimistically clear any visible error so the squiggle
      // doesn't linger while the user is mid-fix — the next compile
      // will reinstate it (after the grace window) if it's still
      // there.
      cancelPendingError();
      if (currentErrorRef.current) setError(undefined);
      handleContentChange(md);
    });
  };

  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
};
