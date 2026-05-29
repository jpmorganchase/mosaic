import { Icon } from '@jpmorganchase/mosaic-components';
import { useEditHistory } from '../../hooks/useEditHistory';
import { useEditMode } from '../../useEditMode';
import { SaveButton } from '../SaveButton';
import { CompileStatus } from '../CompileStatus';
import { SaveStatePill } from '../SaveStatePill';
import { TextFormatTooltray } from './TextFormatTooltray';
// ...existing code...
import { InsertTable } from './InsertTable';
import { InsertImage } from './InsertImage';
import { InsertLinkButton } from './InsertLink';
import { InsertHorizontalRule } from './InsertHorizontalRule';
import { BaseToolbar } from '../BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from '../BaseTooltray/BaseTooltray';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarSeparator } from './ToolbarSepartor';

interface ToolbarProps {
  onSave: () => void;
}

const Toolbar = ({ onSave }: ToolbarProps) => {
  const { canRedo, canUndo, redoEdit, undoEdit } = useEditHistory();
  const { stopEditing } = useEditMode();

  return (
    <BaseToolbar aria-label="page editing toolbar">
      <Tooltray aria-label="history tooltray">
        <ToolbarButton label="Undo" disabled={!canUndo} onClick={undoEdit}>
          <Icon name="undo" />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!canRedo} onClick={redoEdit}>
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
      <Tooltray aria-label="stop editing tooltray" align="right">
        <CompileStatus />
        <SaveStatePill />
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
