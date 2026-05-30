'use client';

/**
 * Phase 0 — Extension API authoring for MarkdownImagePlugin.
 *
 * Mirrors `HorizontalRuleExtension.ts`: same command-handler register
 * logic that lives in the React component (`MarkdownImagePlugin.tsx`),
 * packaged as a `LexicalExtension`.
 *
 * Command symbol ownership
 * ------------------------
 * `INSERT_MARKDOWN_IMAGE_COMMAND` and `InsertImagePayload` are
 * declared HERE, in the extension file, not in the React plugin
 * file. The React plugin file re-exports them for backwards
 * compatibility while it still exists, but the source of truth is
 * this extension. Rationale:
 *
 *   - The extension is the unit that owns the command's behaviour
 *     (the registered handler). Co-locating the symbol with the
 *     handler matches Lexical's own pattern (`TOGGLE_LINK_COMMAND`
 *     lives in `@lexical/link`, not in a separate `commands.ts`).
 *
 *   - In Path B's 0d step we delete the React plugin file
 *     entirely. Declaring the symbol there now would force a
 *     symbol-move during 0d that risks a stale-import-graph bug
 *     (something forgets to update its import path). Declaring it
 *     here from the start means 0d is a pure deletion.
 */

import { defineExtension } from 'lexical';
import {
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
  type LexicalCommand
} from 'lexical';

export interface InsertImagePayload {
  url: string | null;
  alt: string | null;
}

export const INSERT_MARKDOWN_IMAGE_COMMAND: LexicalCommand<InsertImagePayload> = createCommand(
  'INSERT_MARKDOWN_IMAGE_COMMAND'
);

export const MarkdownImageExtension = defineExtension({
  name: 'mosaic/markdown-image',
  register: editor =>
    editor.registerCommand(
      INSERT_MARKDOWN_IMAGE_COMMAND,
      ({ url, alt }: InsertImagePayload) => {
        editor.update(() => {
          const selection = $getSelection();
          // Same guard as the React plugin: url/alt are typed as
          // `string | null` but the toolbar dialog yup-validates
          // them to strings before dispatch, so the null branch is
          // unreachable in practice. The check stays as defence in
          // depth.
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
    )
});
