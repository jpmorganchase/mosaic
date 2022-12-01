import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand
} from 'lexical';
import { useCallback, useEffect } from 'react';

export interface InsertImagePayload {
  url: string | null;
  alt: string | null;
}

export const INSERT_MARKDOWN_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand();

function useMarkdownImagePlugin() {
  const [editor] = useLexicalComposerContext();

  const createImage = useCallback(
    ({ url, alt }: InsertImagePayload) => {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection) && url !== undefined && alt !== undefined) {
          const imageNode = $createParagraphNode().append($createTextNode(`![${alt}](${url})`));

          if (selection.focus.getNode().canInsertTextAfter()) {
            selection.insertNodes([imageNode]);
          }
        }
      });
    },
    [editor]
  );

  useEffect(
    () =>
      editor.registerCommand(
        INSERT_MARKDOWN_IMAGE_COMMAND,
        (payload: InsertImagePayload) => {
          createImage(payload);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
    [editor, createImage]
  );
}

export function MarkdownImagePlugin() {
  useMarkdownImagePlugin();

  return null;
}
