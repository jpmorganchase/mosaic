'use client';

/**
 * Extension API authoring for the markdown-link insertion command
 * (command half only — the `<InsertLinkDialog />` JSX surface is a
 * direct child of `<LexicalComposer>` and not owned by this file).
 *
 * Pattern (post-Phase 0d) — matches upstream Lexical's
 * `ClearEditorExtension` template:
 *
 *   1. `registerMarkdownLink(editor)` — standalone helper that
 *      owns the command-registration logic and returns its own
 *      unregister. Called from `Editor.tsx`'s
 *      `<CommandHandlerRegistrations />` for the live editor.
 *
 *   2. `MarkdownLinkExtension` — thin `defineExtension` wrapper
 *      whose `register` field calls the helper. For headless
 *      consumers via `buildEditorFromExtensions` and the smoke test.
 *
 * Command symbol ownership
 * ------------------------
 * `INSERT_MARKDOWN_LINK_COMMAND` and `InsertLinkPayload` are
 * declared HERE. Phase 0d deleted the old
 * `plugins/MarkdownLinkPlugin.tsx` re-export shim; all callers
 * (`Toolbar/InsertLink.tsx`, the ⌘K keyboard shortcut path) import
 * from this file directly.
 */

import { $createLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import {
  $createTextNode,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  $isTextNode,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  type LexicalCommand,
  type LexicalEditor
} from 'lexical';

export interface InsertLinkPayload {
  url?: string;
  text?: string;
}

export const INSERT_MARKDOWN_LINK_COMMAND: LexicalCommand<InsertLinkPayload> = createCommand(
  'INSERT_MARKDOWN_LINK_COMMAND'
);

/**
 * Standalone register fn. Returns an unregister for teardown.
 *
 * Handler semantics (preserved verbatim from the original React
 * plugin): split on focus-node type.
 *
 *   - Inline selection (focus in a text node): delegate to
 *     `@lexical/link`'s `TOGGLE_LINK_COMMAND` so the existing
 *     AutoLinkNode / LinkNode wrapping logic handles partial-
 *     selection edge cases (mid-word URLs, selection overlapping
 *     an existing link, etc.).
 *
 *   - Empty selection: construct a fresh link node with the
 *     dialog's `text` as the visible label, preserving the
 *     surrounding format (bold/italic) so a link inserted into
 *     bold text stays bold.
 */
export function registerMarkdownLink(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    INSERT_MARKDOWN_LINK_COMMAND,
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
      return true;
    },
    COMMAND_PRIORITY_EDITOR
  );
}

export const MarkdownLinkExtension = defineExtension({
  name: 'mosaic/markdown-link',
  register: editor => registerMarkdownLink(editor)
});
