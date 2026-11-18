'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Icon } from '@jpmorganchase/mosaic-components';
import { BaseToolbar as Toolbar } from './BaseToolbar/BaseToolbar';
import { BaseTooltray as Tooltray } from './BaseTooltray/BaseTooltray';
import { ToolbarButton } from './Toolbar/ToolbarButton';
import { NewPageDialog } from './NewPageDialog';

import { useAuthoringSite } from '../authoringSite';
import { useEditModeActions, useIsEditing } from '../useEditMode';
import styles from './EditorControls.css';

export interface EditorControlsProps {
  /**
   * Whether the author may edit here, usually whether they're signed in.
   * Ignored when an authoring site is set: the controls then always open
   * the authoring site, which checks for itself.
   */
  enabled?: boolean;
}

export const EditorControls = ({ enabled: signedIn = false }: EditorControlsProps) => {
  const isEditing = useIsEditing();
  const { startEditing, stopEditing } = useEditModeActions();
  const pathname = usePathname();
  // Pages on this environment are edited on another site (see
  // `authoringSite.ts`): open the same page there instead.
  const authoringSite = useAuthoringSite();
  const enabled = authoringSite !== undefined || signedIn;
  const handleEditClick = () => {
    if (authoringSite) {
      window.location.assign(authoringSite.href(`${pathname ?? '/'}?edit=1`));
      return;
    }
    if (isEditing) stopEditing();
    else startEditing();
  };

  // Dialog open-state is local — the only launcher is the
  // sibling toolbar button below. Lifting to context would
  // only be worth it if another component also needed to open
  // the dialog.
  const [isNewPageOpen, setIsNewPageOpen] = useState(false);

  const editLabel = authoringSite
    ? `Edit Page on ${authoringSite.host}`
    : isEditing
    ? 'Cancel Editing'
    : 'Edit Page';
  const editOverflowLabel = !enabled ? 'Login Required to Edit' : editLabel;
  const newPageOverflowLabel = !enabled
    ? 'Login Required to Create Page'
    : authoringSite
    ? `New Page on ${authoringSite.host}`
    : 'New Page';

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
            aria-label={
              authoringSite
                ? `edit this page on ${authoringSite.host}`
                : isEditing
                ? 'cancel editing'
                : 'start editing'
            }
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
