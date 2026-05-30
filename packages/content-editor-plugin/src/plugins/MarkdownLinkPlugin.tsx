import { $createLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR
} from 'lexical';
import { useCallback, useEffect } from 'react';

import { InsertLinkDialog } from '../components/Toolbar/InsertLink';
// Command symbol + payload moved to the extension file in Phase 0a
// of the Extension API migration. Re-exported here so existing
// callsites (`Toolbar/InsertLink.tsx`, the ⌘K keyboard shortcut)
// keep working without an import-path change. This file (and the
// re-export) will be deleted in Phase 0d once the live editor is on
// `<LexicalExtensionComposer>` and the React plugin is no longer
// mounted.
import {
  INSERT_MARKDOWN_LINK_COMMAND,
  type InsertLinkPayload
} from '../extensions/MarkdownLinkExtension';

export {
  INSERT_MARKDOWN_LINK_COMMAND,
  type InsertLinkPayload
} from '../extensions/MarkdownLinkExtension';

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
