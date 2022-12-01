import React from 'react';
import { Toolbar as ToolkitToolbar, ToolbarButton, Tooltray } from '@jpmorganchase/uitk-lab';
import { Icon } from '@jpmorganchase/mosaic-components';

import { useEditHistory } from '../../hooks/useEditHistory';
import { usePageState } from '../../store';
import { SaveButton } from '../SaveButton';
import { TextFormatTooltray } from './TextFormatTooltray';
import { InsertTable } from './InsertTable';
import { InsertImage } from './InsertImage';
import { InsertLinkButton } from './InsertLink';
import { InsertHorizontalRule } from './InsertHorizontalRule';

const Toolbar = () => {
  const { canRedo, canUndo, redoEdit, undoEdit } = useEditHistory();
  const { setPageState } = usePageState();

  return (
    <ToolkitToolbar aria-label="page editing toolbar" style={{ minWidth: '100px' }}>
      <Tooltray aria-label="history tooltray">
        <ToolbarButton label="Undo" disabled={!canUndo} onClick={undoEdit}>
          <Icon name="undo" />
        </ToolbarButton>
        <ToolbarButton label="Redo" disabled={!canRedo} onClick={redoEdit}>
          <Icon name="redo" />
        </ToolbarButton>
      </Tooltray>
      <TextFormatTooltray />
      <Tooltray aria-label="text format tooltray">
        <InsertLinkButton />
        <InsertTable />
        <InsertImage />
        <InsertHorizontalRule />
      </Tooltray>
      <Tooltray aria-label="stop editing tooltray" alignEnd>
        <ToolbarButton label="Cancel Editing" onClick={() => setPageState('VIEW')}>
          <Icon name="delete" />
        </ToolbarButton>
      </Tooltray>
      <Tooltray aria-label="copy tooltray" data-pad-start>
        <SaveButton />
      </Tooltray>
    </ToolkitToolbar>
  );
};

export default Toolbar;
