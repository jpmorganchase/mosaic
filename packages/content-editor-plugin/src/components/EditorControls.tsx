import React from 'react';
import { Icon } from '@jpmorganchase/mosaic-components';
import { Toolbar as SaltToolbar, Tooltray, ToolbarButton } from '@salt-ds/lab';

import { default as useContentEditor } from '../store';
import styles from './EditorControls.css';

export const EditorControls = ({ isLoggedIn = false }) => {
  const { pageState, startEditing, stopEditing } = useContentEditor();
  const isEditing = pageState === 'EDIT';

  const handleClick = () => (!isEditing ? startEditing() : stopEditing());

  const loggedInLabel = isEditing ? 'Cancel Editing' : 'Edit Page';
  const overflowLabel = !isLoggedIn ? 'Login Required to Edit' : loggedInLabel;

  return (
    <SaltToolbar aria-label="editor-controls" className={styles.root}>
      <Tooltray aria-label="page editor controls tooltray">
        <ToolbarButton
          aria-label={isEditing ? 'cancel editing' : 'start editing'}
          onClick={handleClick}
          disabled={!isLoggedIn}
          label={overflowLabel}
          style={{ lineHeight: 'normal' }}
        >
          <Icon name={isEditing ? 'delete' : 'edit'} />
        </ToolbarButton>
      </Tooltray>
    </SaltToolbar>
  );
};
