import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR
} from 'lexical';
import { useCallback, useEffect } from 'react';

// Command symbol + payload moved to the extension file in Phase 0a
// of the Extension API migration. Re-exported here so existing
// callsites (`Toolbar/InsertImage.tsx`, the toolbar dialog) keep
// working without an import-path change. This file (and the
// re-export) will be deleted in Phase 0d once the live editor is on
// `<LexicalExtensionComposer>` and the React plugin is no longer
// mounted.
import {
  INSERT_MARKDOWN_IMAGE_COMMAND,
  type InsertImagePayload
} from '../extensions/MarkdownImageExtension';

export {
  INSERT_MARKDOWN_IMAGE_COMMAND,
  type InsertImagePayload
} from '../extensions/MarkdownImageExtension';

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
