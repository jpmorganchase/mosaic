'use client';

import { useState } from 'react';
import { Icon } from '@jpmorganchase/mosaic-components';
import { BaseToolbar as Toolbar } from './BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from './BaseTooltray/BaseTooltray';
import { ToolbarButton } from './Toolbar/ToolbarButton';
import { NewPageDialog } from './NewPageDialog';

import { useEditMode } from '../useEditMode';
import styles from './EditorControls.css';

export interface EditorControlsProps {
  enabled?: boolean;
}

export const EditorControls = ({ enabled = false }: EditorControlsProps) => {
  const { isEditing, startEditing, stopEditing } = useEditMode();
  const handleEditClick = () => (isEditing ? stopEditing() : startEditing());

  // Dialog open-state is local — the only launcher is the
  // sibling toolbar button below. Lifting to context would
  // only be worth it if another component also needed to open
  // the dialog.
  const [isNewPageOpen, setIsNewPageOpen] = useState(false);

  const editLabel = isEditing ? 'Cancel Editing' : 'Edit Page';
  const editOverflowLabel = !enabled ? 'Login Required to Edit' : editLabel;
  const newPageOverflowLabel = !enabled ? 'Login Required to Create Page' : 'New Page';

  return (
    <>
      <Toolbar aria-label="editor-controls" className={styles.root}>
        <Tooltray aria-label="page editor controls tooltray">
          <ToolbarButton
            aria-label="create a new page"
            onClick={() => setIsNewPageOpen(true)}
            disabled={!enabled}
            label={newPageOverflowLabel}
          >
            <Icon name="addDocument" />
          </ToolbarButton>
          <ToolbarButton
            aria-label={isEditing ? 'cancel editing' : 'start editing'}
            onClick={handleEditClick}
            disabled={!enabled}
            label={editOverflowLabel}
          >
            <Icon name={isEditing ? 'delete' : 'edit'} />
          </ToolbarButton>
        </Tooltray>
      </Toolbar>
      <NewPageDialog open={isNewPageOpen} onOpenChange={setIsNewPageOpen} />
    </>
  );
};
