'use client';

/**
 * Extension API authoring for the markdown-image insertion command.
 *
 * Pattern (post-Phase 0d) — matches upstream Lexical's
 * `ClearEditorExtension` template:
 *
 *   1. `registerMarkdownImage(editor)` — standalone helper that
 *      owns the command-registration logic and returns its own
 *      unregister. Called from `Editor.tsx`'s
 *      `<CommandHandlerRegistrations />` for the live editor.
 *
 *   2. `MarkdownImageExtension` — thin `defineExtension` wrapper
 *      whose `register` field calls the helper. For headless
 *      consumers via `buildEditorFromExtensions` and the smoke test.
 *
 * Command symbol ownership
 * ------------------------
 * `INSERT_MARKDOWN_IMAGE_COMMAND` and `InsertImagePayload` are
 * declared HERE — the extension is the unit that owns the
 * command's behaviour, so its symbol lives next to its handler.
 * Matches Lexical's own pattern (`TOGGLE_LINK_COMMAND` lives in
 * `@lexical/link`, not in a separate `commands.ts`). Phase 0d
 * deleted the old `plugins/MarkdownImagePlugin.tsx` re-export
 * shim; all callers (`Toolbar/InsertImage.tsx`) import from this
 * file directly.
 */

import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  defineExtension,
  type LexicalCommand,
  type LexicalEditor
} from 'lexical';

export interface InsertImagePayload {
  url: string | null;
  alt: string | null;
}

export const INSERT_MARKDOWN_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand(
  'INSERT_MARKDOWN_IMAGE_COMMAND'
);

/**
 * Standalone register fn. Returns an unregister for teardown.
 *
 * Handler semantics (preserved verbatim from the original React
 * plugin): wrap the markdown image literal in a fresh paragraph
 * and `selection.insertNodes` it. The `url !== undefined && alt
 * !== undefined` guard is defence-in-depth — the toolbar dialog
 * yup-validates both to non-empty strings before dispatch, so the
 * null branch is unreachable in practice.
 */
export function registerMarkdownImage(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    INSERT_MARKDOWN_IMAGE_COMMAND,
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
      return true;
    },
    COMMAND_PRIORITY_EDITOR
  );
}

export const MarkdownImageExtension = defineExtension({
  name: 'mosaic/markdown-image',
  register: editor => registerMarkdownImage(editor)
});
