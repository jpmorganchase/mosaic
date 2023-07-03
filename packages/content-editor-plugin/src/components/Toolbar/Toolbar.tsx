import React from 'react';
import { Icon } from '@jpmorganchase/mosaic-components';
import { useEditHistory } from '../../hooks/useEditHistory';
import { usePageState } from '../../store';
import { SaveButton } from '../SaveButton';
import { TextFormatTooltray } from './TextFormatTooltray';
import { InsertTable } from './InsertTable';
import { InsertImage } from './InsertImage';
import { InsertLinkButton } from './InsertLink';
import { InsertHorizontalRule } from './InsertHorizontalRule';
import { BaseToolbar } from '../BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from '../BaseTooltray/BaseTooltray';
import { ToolbarButton } from './ToolbarButton';
import { ToolbarSeparator } from './ToolbarSepartor';

const Toolbar = () => {
  const { canRedo, canUndo, redoEdit, undoEdit } = useEditHistory();
  const { setPageState } = usePageState();

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
        <ToolbarButton label="Cancel Editing" onClick={() => setPageState('VIEW')}>
          <Icon name="delete" />
        </ToolbarButton>
        <ToolbarSeparator />
      </Tooltray>
      <Tooltray aria-label="copy tooltray">
        <SaveButton />
      </Tooltray>
    </BaseToolbar>
  );
};

export default Toolbar;
