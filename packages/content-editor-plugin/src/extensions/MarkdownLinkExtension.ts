'use client';

/**
 * Phase 0 — Extension API authoring for MarkdownLinkPlugin's
 * command half.
 *
 * Unlike the other two Phase-0 extensions, the React component
 * `MarkdownLinkPlugin` is NOT a pure null-render — it also renders
 * `<InsertLinkDialog />`. That dialog needs React context
 * (`useIsInsertingLink`) and Salt UI primitives that have no place
 * inside a Lexical extension's `register` hook.
 *
 * So we split the responsibilities:
 *
 *   - This extension owns the `INSERT_MARKDOWN_LINK_COMMAND`
 *     handler — pure register logic, no DOM, no React.
 *   - The dialog stays mounted as a React component (in Phase 0d
 *     it's hoisted to a sibling of `<LexicalExtensionComposer>`
 *     rather than being a child of the React plugin file).
 *
 * Command symbol ownership
 * ------------------------
 * `INSERT_MARKDOWN_LINK_COMMAND` and `InsertLinkPayload` are
 * declared HERE. The React plugin file re-exports them for
 * backwards compatibility. See `MarkdownImageExtension.ts` for the
 * rationale; same applies.
 */

import { $createLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { defineExtension } from 'lexical';
import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand
} from 'lexical';

export interface InsertLinkPayload {
  url?: string;
  text?: string;
}

export const INSERT_MARKDOWN_LINK_COMMAND: LexicalCommand<InsertLinkPayload> = createCommand(
  'INSERT_MARKDOWN_LINK_COMMAND'
);

export const MarkdownLinkExtension = defineExtension({
  name: 'mosaic/markdown-link',
  register: editor =>
    editor.registerCommand(
      INSERT_MARKDOWN_LINK_COMMAND,
      ({ url, text }: InsertLinkPayload) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection) && url !== undefined && text !== undefined) {
            const focusNode = selection.focus.getNode();
            if ($isTextNode(focusNode)) {
              // Inline-selection branch: delegate to @lexical/link's
              // own command so the existing AutoLinkNode / LinkNode
              // wrapping logic handles partial-selection edge cases
              // (mid-word URLs, selection overlapping an existing
              // link, etc.).
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
            } else {
              // Empty-selection branch: construct a fresh link node
              // with the dialog's `text` as the visible label.
              // Preserve the surrounding format (bold/italic) so a
              // link inserted into bold text stays bold.
              const linkNode = $createLinkNode(url);
              const linkTextNode = $createTextNode(text);
              linkTextNode.setFormat(selection.focus.getNode().getFormat());
              linkNode.append(linkTextNode);
              $insertNodes([linkNode]);
              linkNode.selectEnd();
            }
          }
        });
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    )
});
