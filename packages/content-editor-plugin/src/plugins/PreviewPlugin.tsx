import { $convertToMarkdownString } from '@lexical/markdown';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';
import { debounce } from 'lodash-es';

import transformers from '../transformers';
import { useContentEditor } from '../index';

interface SourceResponse {
  source: { compiledSource: string; frontmatter: any; scope: any };
  error?: string;
  exception?: string;
}

async function fetchSource(previewUrl: string, markdown: string) {
  const response = await fetch(previewUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ mode: 'markdown', text: markdown })
  });

  const data = (await response.json()) as SourceResponse;
  return data;
}

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

interface PreviewPluginProps {
  previewUrl: string;
}

export const PreviewPlugin = ({ previewUrl }: PreviewPluginProps) => {
  const { setErrorMessage, setPreviewContent } = useContentEditor();

  const handleContentChange = async (content: string) => {
    try {
      if (content) {
        const data = await fetchSource(previewUrl, content);
        if (!data.error && data?.source) {
          setPreviewContent(data.source);
        } else {
          setErrorMessage(`${data.error?.toUpperCase()}: ${data?.exception}`);
        }
      }
    } catch (e) {
      if (e instanceof Error) {
        setErrorMessage(`MDX Error: ${e.message}`);
      }
    }
  };

  const { onChange } = usePreview(handleContentChange);

  return <OnChangePlugin onChange={onChange} ignoreSelectionChange />;
};
