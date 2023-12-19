import React from 'react';
import { $convertToMarkdownString } from '@lexical/markdown';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { useDebouncedCallback } from 'use-debounce';

import transformers from '../transformers';
import useContentEditor from '../store/index';

export interface SourceResponse {
  result?: React.ReactNode;
  error?: string;
}

export interface PreviewPluginProps {
  onChange: ({
    source,
    data
  }: {
    source: string;
    data: Record<string, unknown>;
  }) => Promise<SourceResponse>;
  meta: Record<string, unknown>;
}

function usePreview(onContentChange: (markdown: string) => void) {
  const onChange = useDebouncedCallback((editorState: EditorState) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(transformers);
      if (markdown) {
        onContentChange(markdown);
      }
    });
  }, 400);

  return { onChange };
}

export const PreviewPlugin = ({ onChange: onChangeProp, meta }: PreviewPluginProps) => {
  const { setPreviewContent, setErrorMessage } = useContentEditor();
  const handleContentChange = async (content: string) => {
    if (content) {
      const previewResponse = await onChangeProp({ source: content, data: meta });

      if (previewResponse.error) {
        setErrorMessage(`MDX Error: ${previewResponse.error}`);
      } else {
        setPreviewContent(previewResponse.result);
      }
    }
  };

  const { onChange } = usePreview(handleContentChange);
  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
};
