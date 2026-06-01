'use client';

/**
 * Lexical-coupled formatting tooltrays.
 *
 * Mounted inside `LexicalComposer` by `WysiwygShell`. Portals its
 * content into the chrome toolbar's `<FormattingToolbarSlot>` so
 * the buttons appear on the same visual row as the chrome
 * actions (mode toggle, save, cancel) without needing two
 * stacked toolbars.
 *
 * In source mode this component never mounts (the composer it
 * lives inside doesn't mount), so the slot stays empty and the
 * toolbar shows just the chrome side — which is exactly the UX
 * we want, because formatting buttons aren't meaningful when
 * the user is typing raw markdown directly.
 *
 * History tooltray (undo/redo) lives here too, because
 * `useEditHistory` reads the Lexical history plugin via
 * `useLexicalComposerContext`. The textarea has its own
 * native browser undo stack so the missing buttons in source
 * mode aren't a regression.
 */

import { Icon } from '@jpmorganchase/mosaic-components';

import { useEditHistory } from '../../hooks/useEditHistory';
import { TextFormatTooltray } from './TextFormatTooltray';
import { InsertTable } from './InsertTable';
import { InsertImage } from './InsertImage';
import { InsertLinkButton } from './InsertLink';
import { InsertHorizontalRule } from './InsertHorizontalRule';
import { BaseTooltray as Tooltray } from '../BaseTooltray/BaseTooltray';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarSeparator } from './ToolbarSepartor';
import { FormattingToolbarPortal } from '../FormattingToolbarSlot';
import { SHORTCUTS } from '../../utils/shortcuts';

export const WysiwygFormattingTooltrays = () => {
  const { canRedo, canUndo, redoEdit, undoEdit } = useEditHistory();

  return (
    <FormattingToolbarPortal>
      <Tooltray aria-label="history tooltray">
        <ToolbarButton
          label="Undo"
          shortcut={SHORTCUTS.undo}
          disabled={!canUndo}
          onClick={undoEdit}
        >
          <Icon name="undo" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          shortcut={SHORTCUTS.redo}
          disabled={!canRedo}
          onClick={redoEdit}
        >
          <Icon name="redo" />
        </ToolbarButton>
        <ToolbarSeparator />
      </Tooltray>
      <TextFormatTooltray />
      <Tooltray aria-label="text format tooltray">
        <InsertLinkButton />
        <InsertTable />
        <InsertImage />
        <InsertHorizontalRule />
        <ToolbarSeparator />
      </Tooltray>
    </FormattingToolbarPortal>
  );
};
