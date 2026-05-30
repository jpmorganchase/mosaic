'use client';

/**
 * Phase 0 — Extension API authoring for HorizontalRulePlugin.
 *
 * This file packages the same register-effect that lives in
 * `HorizontalRulePlugin.tsx` as a `LexicalExtension`. It is NOT mounted
 * by the live editor yet — `Editor.tsx` still renders the React
 * `<HorizontalRulePlugin />` component, so runtime behaviour is
 * unchanged. The extension exists so we can:
 *
 *   1. Validate that the extension-shape compiles and registers
 *      against our pinned `lexical@0.45.0` (headless smoke test in
 *      `__extension-smoke__.ts`).
 *   2. Give subsequent phases a single object to add as a dependency
 *      of the root extension when we switch from `<LexicalComposer>`
 *      to `<LexicalExtensionComposer>` (planned Phase 2 in the
 *      Extension-API roadmap).
 *
 * Why we don't just import upstream's `HorizontalRuleExtension` from
 * `@lexical/extension`
 * --------------------------------------------------------------------
 * `@lexical/extension` ships its own `HorizontalRuleExtension`, but
 * adopting it would silently change the insertion semantics: upstream
 * inserts the HR at the current paragraph's position, whereas ours
 * does `selection.insertParagraph()` first and inserts BEFORE the
 * resulting top-level element. That difference is observable in our
 * E2E tests (the caret lands one paragraph below the HR, which is
 * the placement our authors expect). Keeping our register logic
 * verbatim preserves that behaviour. We can switch to upstream's
 * extension later as a deliberate UX change, not as a side-effect
 * of the API migration.
 *
 * Authoring shape (used as the template for the other two Phase-0
 * extensions, `MarkdownImageExtension` and `MarkdownLinkExtension`):
 *
 *   - `name`: unique within an editor; we prefix `mosaic/` so we
 *     can never collide with upstream's own extensions.
 *   - `register(editor, _config, state)`: the body is the same code
 *     that the React component's `useEffect` runs. We return the
 *     unregister function so the editor's lifecycle (dispose on
 *     unmount) can call it. `state.getSignal()` is available but
 *     unused here — a simple `registerCommand` return-value cleanup
 *     is enough.
 */

import { defineExtension } from 'lexical';
import {
  $createHorizontalRuleNode,
  INSERT_HORIZONTAL_RULE_COMMAND
} from '@lexical/react/LexicalHorizontalRuleNode';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR } from 'lexical';

export const HorizontalRuleExtension = defineExtension({
  name: 'mosaic/horizontal-rule',
  register: editor =>
    editor.registerCommand(
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
    )
});
