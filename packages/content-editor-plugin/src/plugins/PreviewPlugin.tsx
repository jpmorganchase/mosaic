'use client';

/**
 * Lexical plugin that compiles the current editor content via a host-
 * supplied Server Action (debounced on keystrokes) and stores the
 * result in the editor context for the preview pane to render.
 *
 * The action is invoked inside `useTransition` so the resulting state
 * updates are non-urgent — typing stays responsive even when a slow
 * compile is in flight.
 */
import { $convertToMarkdownString } from '@lexical/markdown';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { debounce } from 'lodash-es';
import { useEffect, useMemo, useRef, useTransition } from 'react';
import type { SerializeResult } from 'next-mdx-remote-client/serialize';

import transformers from '../transformers';
import { useErrorMessage, useSetIsCompiling, useSetPreviewContent } from '../EditorContext';
import { formatMdxError } from '../utils/formatMdxError';

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
  const { setError } = useErrorMessage();
  const [, startTransition] = useTransition();
  const didSeedRef = useRef(false);

  // `debounce` returns a new function on every render; memoise it so
  // the leading/trailing timer state is preserved across keystrokes
  // and `OnChangePlugin` doesn't re-subscribe each render.
  const handleContentChange = useMemo(
    () =>
      debounce(
        (markdown: string) => {
          // Flip the compile-status flag synchronously so the UI can
          // show a spinner immediately — useTransition's pending state
          // is non-urgent and would visibly lag a fast typist.
          setIsCompiling(true);
          startTransition(async () => {
            try {
              const source = await compilePreview(markdown);
              if ('error' in source && source.error) {
                // Surface the compile error in the banner but KEEP the
                // last successful preview rendered — clearing it on
                // every typo is jarring and makes the editor feel
                // broken while the user is mid-edit.
                setError(formatMdxError(source.error));
              } else {
                setError(undefined);
                setPreviewContent(source);
              }
            } catch (e) {
              setError(formatMdxError(e));
            } finally {
              setIsCompiling(false);
            }
          });
        },
        250,
        { maxWait: 500 }
      ),
    [compilePreview, setError, setIsCompiling, setPreviewContent]
  );

  // Cancel any pending debounced call on unmount so a stale compile
  // doesn't fire setState on an unmounted tree.
  useEffect(() => () => handleContentChange.cancel(), [handleContentChange]);

  // Seed the preview once on mount by compiling the editor's initial
  // content. Without this the preview pane stays blank until the user
  // types — confusing for read-only previews and for users who open
  // the editor just to inspect the rendered output.
  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    editor.getEditorState().read(() => {
      const markdown = $convertToMarkdownString(transformers);
      if (!markdown) return;
      setIsCompiling(true);
      startTransition(async () => {
        try {
          const source = await compilePreview(markdown);
          if ('error' in source && source.error) {
            setError(formatMdxError(source.error));
          } else {
            setError(undefined);
            setPreviewContent(source);
          }
        } catch (e) {
          setError(formatMdxError(e));
        } finally {
          setIsCompiling(false);
        }
      });
    });
  }, [editor, compilePreview, setError, setIsCompiling, setPreviewContent]);

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(transformers);
      if (markdown) {
        handleContentChange(markdown);
      }
    });
  };


  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
};
