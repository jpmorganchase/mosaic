import React from 'react';
import { $convertToMarkdownString } from '@lexical/markdown';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import debounce from 'lodash/debounce';

import transformers from '../transformers';
import { useContentEditor } from '../index';

function usePreview(onContentChange: (markdown: string) => void) {
  const handleContentChange = debounce(onContentChange, 250, { maxWait: 500 });

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const markdown = $convertToMarkdownString(transformers);
      if (markdown) {
        handleContentChange(markdown);
      }
    });
  };

  return { onChange };
}

export type PreviewPluginProps = {
  compileMDX: (source: string, parseFrontMatter: boolean) => Promise<any>;
};

export const PreviewPlugin: React.FC<PreviewPluginProps> = ({ compileMDX }) => {
  const { setErrorMessage, setPreviewContent } = useContentEditor();

  const handleContentChange = async (content: string) => {
    try {
      const data = await compileMDX(content, false /** Don't parse frontmatter */);
      setPreviewContent(data);
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(`MDX Error: ${e.message}`);
      }
    }
  };

  const { onChange } = usePreview(handleContentChange);

  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
};
