import React from 'react';
import { Icon } from '@jpmorganchase/mosaic-components';
import { BaseToolbar as Toolbar } from './BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from './BaseTooltray/BaseTooltray';
import { ToolbarButton } from './Toolbar/ToolbarButton';

import { default as useContentEditor } from '../store';
import styles from './EditorControls.css';

export interface EditorControlsProps {
  enabled?: boolean;
}

export const EditorControls = ({ enabled = false }: EditorControlsProps) => {
  const { pageState, startEditing, stopEditing } = useContentEditor();
  const isEditing = pageState === 'EDIT';

  const handleClick = () => (!isEditing ? startEditing() : stopEditing());

  const enabledLabel = isEditing ? 'Cancel Editing' : 'Edit Page';
  const overflowLabel = !enabled ? 'Login Required to Edit' : enabledLabel;

  return (
    <Toolbar aria-label="editor-controls" className={styles.root}>
      <Tooltray aria-label="page editor controls tooltray">
        <ToolbarButton
          aria-label={isEditing ? 'cancel editing' : 'start editing'}
          onClick={handleClick}
          disabled={!enabled}
          label={overflowLabel}
        >
          <Icon name={isEditing ? 'delete' : 'edit'} />
        </ToolbarButton>
      </Tooltray>
    </Toolbar>
  );
};
