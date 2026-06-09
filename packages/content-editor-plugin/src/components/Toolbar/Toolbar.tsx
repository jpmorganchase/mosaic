import { Icon } from '@jpmorganchase/mosaic-components';
import { useEditMode } from '../../useEditMode';
import { SaveButton } from '../SaveButton';
import { CompileStatus } from '../CompileStatus';
import { SaveStatePill } from '../SaveStatePill';
import { BaseToolbar } from '../BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from '../BaseTooltray/BaseTooltray';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarSeparator } from './ToolbarSepartor';
import { ShortcutHelpButton } from './ShortcutHelpButton';
import { ModeToggle } from './ModeToggle';
import { FormattingToolbarSlotTarget } from '../FormattingToolbarSlot';

interface ToolbarProps {
  onSave: () => void;
}

/**
 * Top-level editor toolbar.
 *
 * Split into two halves driven by which view mode is active:
 *
 *   - **Chrome (this file).** Mode-agnostic actions that need to
 *     work in both WYSIWYG and source mode: save, cancel,
 *     mode toggle, shortcut help, compile status, save-state
 *     pill. Mounted OUTSIDE `LexicalComposer` so it survives
 *     mode flips intact.
 *
 *   - **Formatting (`WysiwygFormattingTooltrays`).** Lexical-
 *     coupled actions that only make sense when the WYSIWYG
 *     composer is mounted: undo/redo, bold/italic/etc. text
 *     format, insert link/table/image/HR. Mounted INSIDE
 *     `LexicalComposer` (by `WysiwygShell`) and portaled into
 *     the `<FormattingToolbarSlot>` rendered here so the visual
 *     toolbar still looks like one continuous bar. In source
 *     mode the composer isn't mounted, the portal source never
 *     renders, and the slot stays empty — which is the right
 *     UX because formatting buttons can't operate on a raw
 *     textarea anyway.
 */
const Toolbar = ({ onSave }: ToolbarProps) => {
  const { stopEditing } = useEditMode();

  return (
    <BaseToolbar aria-label="page editing toolbar">
      <FormattingToolbarSlotTarget />
      <Tooltray aria-label="stop editing tooltray" align="right">
        <CompileStatus />
        <SaveStatePill />
        <ModeToggle />
        <ShortcutHelpButton />
        <ToolbarButton label="Cancel Editing" onClick={stopEditing}>
          <Icon name="delete" />
        </ToolbarButton>
        <ToolbarSeparator />
      </Tooltray>
      <Tooltray aria-label="copy tooltray">
        <SaveButton onSave={onSave} />
      </Tooltray>
    </BaseToolbar>
  );
};

export default Toolbar;
