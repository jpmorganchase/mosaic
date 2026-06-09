'use client';

/**
 * Raw-markdown source editor.
 *
 * Mounted in place of the Lexical composer when `?mode=source`.
 * Drives the same `compilePreview` Server Action as
 * {@link ../../plugins/PreviewPlugin}, debounced identically so
 * authors get the same "type → 250 ms → preview updates" rhythm
 * regardless of which view they're in.
 *
 * Why this lives outside the Lexical composer
 * -------------------------------------------
 * Lexical's `useLexicalComposerContext` requires the composer
 * mounted; in source mode we deliberately *don't* mount it (the
 * point of the toggle is the user prefers a textarea). So all the
 * Lexical-coupled plugins (`PreviewPlugin`, `DirtyTrackerPlugin`,
 * `ErrorHighlightPlugin`, `MarkdownShortcutPlugin`, etc.) are gone
 * from this branch. The only surfaces this component needs to
 * keep alive are the ones that are model-agnostic:
 *
 *   - `useSetPreviewContent` — preview pane stays in sync.
 *   - `useErrorMessage` — banner still works for compile errors.
 *   - `useSetIsCompiling` — "Compiling…" pill still works.
 *   - `useSaveState.markDirty` — save pill flips on edit.
 *
 * The line-map (used by `ErrorHighlightPlugin` to underline the
 * broken block in WYSIWYG) doesn't apply here: the textarea has its
 * own native cursor + scroll, and the error banner already shows
 * `Ln N, Col M` which the user can navigate to with their own
 * keyboard. Skipping the highlight is correct, not a regression.
 *
 * Cursor / scroll preservation across mode flips is handled by the
 * parent (`Editor.tsx`), which seeds the `defaultValue` of the
 * textarea with the markdown captured at flip-time and seeds the
 * caret via {@link initialCaret}.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useTransition,
  type ChangeEvent
} from 'react';
import { debounce } from 'lodash-es';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import {
  useSaveState,
  useSetIsCompiling,
  useSetPreviewContent,
  useErrorMessage
} from '../../EditorContext';
import { formatMdxError } from '../../utils/formatMdxError';
import style from './SourceEditor.css';

/** Imperative handle the parent uses to read/write the textarea. */
export interface SourceEditorHandle {
  /** Current markdown value — used by the save dialog and by the WYSIWYG bridge. */
  getValue: () => string;
  /** 0-based caret offset (start of the selection). */
  getCaret: () => number;
  /** Move focus into the textarea (used after a mode flip). */
  focus: () => void;
}

export interface SourceEditorProps {
  /** Initial markdown to seed the textarea with. */
  initialValue: string;
  /** Initial caret offset; clamped into the value's range. */
  initialCaret?: number;
  /** Server Action that compiles MDX → renderer payload. */
  compilePreview: (markdown: string) => Promise<SerializeResult>;
}

/**
 * How long to wait after the last keystroke before kicking off a
 * preview compile. Matches `PreviewPlugin`'s 250 ms so switching
 * modes mid-edit doesn't change the perceived responsiveness of
 * the preview pane.
 */
const COMPILE_DEBOUNCE_MS = 250;

export const SourceEditor = forwardRef<SourceEditorHandle, SourceEditorProps>(function SourceEditor(
  { initialValue, initialCaret = 0, compilePreview },
  handleRef
) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const setPreviewContent = useSetPreviewContent();
  const setIsCompiling = useSetIsCompiling();
  const { setError } = useErrorMessage();
  const { markDirty } = useSaveState();
  const [, startTransition] = useTransition();
  // Same monotonic-id pattern as PreviewPlugin: out-of-order
  // server responses from successive debounced calls would
  // otherwise let a stale failing compile resurrect over a
  // fresh successful one.
  const compileSeqRef = useRef(0);
  // True after the user has actually typed once — used to gate
  // `markDirty()` so the initial seed (which fires `onChange`
  // synthetically in some browsers? no, but DefaultValue is the
  // safer assumption) doesn't paint the save pill orange before
  // a single keystroke.
  const armedRef = useRef(false);

  // Keep callbacks stable across renders so the debounce timer
  // state isn't reset on every parent render. The shared
  // identity also lets us .cancel() on unmount.
  const runCompile = useMemo(
    () => (markdown: string) => {
      const seq = ++compileSeqRef.current;
      setIsCompiling(true);
      startTransition(async () => {
        try {
          const source = await compilePreview(markdown);
          if (seq !== compileSeqRef.current) return;
          if ('error' in source && source.error) {
            setError(formatMdxError(source.error));
          } else {
            setError(undefined);
            setPreviewContent(source);
          }
        } catch (e) {
          if (seq !== compileSeqRef.current) return;
          setError(formatMdxError(e));
        } finally {
          if (seq === compileSeqRef.current) setIsCompiling(false);
        }
      });
    },
    [compilePreview, setError, setIsCompiling, setPreviewContent]
  );

  const debouncedCompile = useMemo(
    () => debounce(runCompile, COMPILE_DEBOUNCE_MS, { maxWait: 500 }),
    [runCompile]
  );

  // Cancel pending compile on unmount so a stale response
  // doesn't setState on an unmounted tree (same defensive
  // teardown PreviewPlugin uses).
  useEffect(
    () => () => {
      debouncedCompile.cancel();
    },
    [debouncedCompile]
  );

  // Seed the preview pane on mount. Without this, flipping
  // wysiwyg → source would blank the preview until the next
  // keystroke (PreviewPlugin handled that for the WYSIWYG side
  // via its own `didSeedRef`; we mirror it here so the seam is
  // invisible to the user).
  useEffect(() => {
    if (initialValue) runCompile(initialValue);
    // We deliberately do not depend on `initialValue` —
    // subsequent renders that change `initialValue` (the parent
    // doing a remount-via-key) get a fresh component, and
    // re-running the compile mid-life would fight the user's
    // typing. Run-once-on-mount is the contract.
  }, []);

  // Seed the caret position once the textarea has mounted. Done
  // in a layout effect so the user never sees a flash of the
  // default `selectionStart=0` before the bridged caret is set.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(initialCaret, initialValue.length));
    // Guard the focus + selection set in a try/catch — a hidden
    // textarea (display: none) throws on selection set in some
    // browsers, and we'd rather degrade silently than crash the
    // editor in an obscure embedding context.
    try {
      el.focus();
      el.setSelectionRange(clamped, clamped);
    } catch {
      /* not focusable yet — fine, the user can click in */
    }
  }, []);

  useImperativeHandle(
    handleRef,
    () => ({
      getValue: () => textareaRef.current?.value ?? '',
      getCaret: () => textareaRef.current?.selectionStart ?? 0,
      focus: () => textareaRef.current?.focus()
    }),
    []
  );

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    if (!armedRef.current) {
      armedRef.current = true;
    } else {
      markDirty();
    }
    // Optimistically clear any visible error on edit so the
    // banner doesn't linger while the user is mid-fix — same
    // UX trick PreviewPlugin uses. The next compile will
    // reinstate it if the new value is still broken.
    setError(undefined);
    debouncedCompile(value);
  };

  return (
    <textarea
      ref={textareaRef}
      defaultValue={initialValue}
      onChange={onChange}
      // Spell-check off: markdown source is full of unfamiliar
      // tokens (component names, prop names, code-fence content)
      // that the browser would underline noisily.
      spellCheck={false}
      // Standard "code editor" affordances — no autocorrect /
      // autocapitalize / autocomplete; the textarea is
      // structured input, not prose.
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      aria-label="Markdown source editor"
      className={style.textarea}
    />
  );
});
