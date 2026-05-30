'use client';

import { Icon } from '@jpmorganchase/mosaic-components';
import { BaseToolbar as Toolbar } from './BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from './BaseTooltray/BaseTooltray';
import { ToolbarButton } from './Toolbar/ToolbarButton';

import { useEditMode } from '../useEditMode';
import styles from './EditorControls.css';

export interface EditorControlsProps {
  enabled?: boolean;
}

export const EditorControls = ({ enabled = false }: EditorControlsProps) => {
  const { isEditing, startEditing, stopEditing } = useEditMode();
  const handleClick = () => (isEditing ? stopEditing() : startEditing());

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
