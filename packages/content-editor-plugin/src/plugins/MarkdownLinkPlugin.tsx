import { $createLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  LexicalCommand
} from 'lexical';
import { useCallback, useEffect } from 'react';

import { InsertLinkDialog } from '../components/Toolbar/InsertLink';

export interface InsertLinkPayload {
  url?: string;
  text?: string;
}

export const INSERT_MARKDOWN_LINK_COMMAND: LexicalCommand<InsertLinkPayload> = createCommand();

function useMarkdownLinkPlugin() {
  const [editor] = useLexicalComposerContext();

  const createLink = useCallback(
    ({ url, text }: InsertLinkPayload) => {
      editor.update(() => {
        const selection = $getSelection();

        if ($isRangeSelection(selection) && url !== undefined && text !== undefined) {
          const focusNode = selection.focus.getNode();

          if ($isTextNode(focusNode)) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
          } else {
            const linkNode = $createLinkNode(url);
            const linkTextNode = $createTextNode(text);
            linkTextNode.setFormat(selection.focus.getNode().getFormat());
            linkNode.append(linkTextNode);
            $insertNodes([linkNode]);
            linkNode.selectEnd();
          }
        }
      });
    },
    [editor]
  );

  useEffect(
    () =>
      editor.registerCommand(
        INSERT_MARKDOWN_LINK_COMMAND,
        (payload: InsertLinkPayload) => {
          createLink(payload);
          return true;
        },
        COMMAND_PRIORITY_EDITOR
      ),
    [editor, createLink]
  );
}

export function MarkdownLinkPlugin() {
  useMarkdownLinkPlugin();

  return <InsertLinkDialog />;
}
