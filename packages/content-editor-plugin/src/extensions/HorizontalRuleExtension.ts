'use client';

/**
 * Extension API authoring for the horizontal-rule insertion command.
 *
 * Pattern — matches upstream Lexical's
 * `ClearEditorExtension` template (see
 * `@lexical/extension/src/ClearEditorExtension.ts`):
 *
 *   1. `registerHorizontalRule(editor)` — standalone helper that
 *      owns the command-registration logic and returns its own
 *      unregister. Called from `Editor.tsx`'s
 *      `<CommandHandlerRegistrations />` for the live editor.
 *
 *   2. `HorizontalRuleExtension` — thin `defineExtension` wrapper
 *      whose `register` field calls the helper. For headless
 *      consumers via `buildEditorFromExtensions` and for the smoke
 *      test.
 *
 * Why we don't use upstream's `HorizontalRuleExtension` from
 * `@lexical/extension`: their version inserts the HR at the current
 * paragraph's position, whereas ours does `selection.insertParagraph()`
 * first and inserts BEFORE the resulting top-level element. The
 * caret then lands one paragraph below the HR, which is the
 * placement our authors expect (and is asserted by our E2E tests).
 * Keeping our own helper preserves that behaviour. Switching
 * to upstream's extension later would be a deliberate UX change.
 *
 * The command symbol stays upstream's `INSERT_HORIZONTAL_RULE_COMMAND`
 * from `@lexical/react/LexicalHorizontalRuleNode` — we never owned
 * it. Only the handler body is ours.
 */

import { defineExtension, type LexicalEditor } from 'lexical';
import {
  $createHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND
} from '@lexical/react/LexicalHorizontalRuleNode';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical';

/**
 * Standalone register fn. Returns an unregister to be called on
 * teardown. Same shape as upstream's `registerClearEditor`.
 *
 * Handler semantics (preserved verbatim from the original React
 * plugin): on `INSERT_HORIZONTAL_RULE_COMMAND` dispatch, insert a
 * fresh paragraph first, then insert the HR *before* the resulting
 * top-level element. Net effect is HR + caret-in-empty-paragraph
 * directly below it.
 */
export function registerHorizontalRule(editor: LexicalEditor): () => void {
  return editor.registerCommand(
    INSERT_HORIZONTAL_RULE_COMMAND,
    () => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) {
        return false;
      }
      const focusNode = selection.focus.getNode();
      if (focusNode !== null) {
        const horizontalRuleNode = $createHorizontalRuleNode();
        selection.insertParagraph();
        selection.focus.getNode().getTopLevelElementOrThrow().insertBefore(horizontalRuleNode);
      }
      return true;
    },
    COMMAND_PRIORITY_EDITOR
  );
}

export const HorizontalRuleExtension = defineExtension({
  name: 'mosaic/horizontal-rule',
  register: editor => registerHorizontalRule(editor)
});
