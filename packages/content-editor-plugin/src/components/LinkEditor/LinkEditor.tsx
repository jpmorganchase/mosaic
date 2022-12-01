import { mergeRegister } from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  RangeSelection,
  SELECTION_CHANGE_COMMAND
} from 'lexical';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Input, useFloatingUI } from '@jpmorganchase/uitk-core';
import { useDismiss, useInteractions } from '@floating-ui/react-dom-interactions';

import styles from './LinkEditor.css';
import { SaveAdornment } from './SaveAdornment';
import { EditLinkButton } from './EditLinkButton';
import { Popper } from '../Popper/Popper';
import { getSelectedNode } from '../../utils/getSelectedNode';

export function LinkEditor() {
  const [editor] = useLexicalComposerContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [lastSelection, setLastSelection] = useState<RangeSelection | null>(null);

  const reset = () => {
    setLinkUrl('');
    setIsEdit(false);
    setLastSelection(null);
  };

  const { context, floating, reference, strategy, x, y } = useFloatingUI({
    placement: 'right',
    strategy: 'absolute',
    open: linkUrl.length > 0,
    onOpenChange: reset
  });
  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      ancestorScroll: true
    })
  ]);

  const updateLinkEditor = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      if ($isLinkNode(parent)) {
        reference(editor.getElementByKey(parent.getKey()));
        setLinkUrl(parent.getURL());
        setLastSelection(selection);
      } else if ($isLinkNode(node)) {
        reference(editor.getElementByKey(node.getKey()));
        setLinkUrl(node.getURL());
        setLastSelection(selection);
      } else {
        // no links to edit on this selection
        reset();
      }
    }
    setIsEdit(false);
    return true;
  }, [editor, reference]);

  useEffect(
    () =>
      mergeRegister(
        editor.registerUpdateListener(({ editorState }) => {
          editorState.read(() => {
            updateLinkEditor();
          });
        }),

        editor.registerCommand(
          SELECTION_CHANGE_COMMAND,
          () => {
            updateLinkEditor();
            return true;
          },
          COMMAND_PRIORITY_LOW
        )
      ),
    [editor, updateLinkEditor]
  );

  useEffect(() => {
    editor.getEditorState().read(() => {
      updateLinkEditor();
    });
  }, [editor, updateLinkEditor]);

  const handleSave = () => {
    if (lastSelection !== null) {
      if (linkUrl !== '') {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, linkUrl);
        setIsEdit(false);
      }
    }
  };

  const handleEdit = () => setIsEdit(true);

  return (
    <Popper
      className={styles.popper}
      ref={floating}
      open={linkUrl.length > 0}
      style={{ top: y ?? '', left: x ?? '', position: strategy }}
      {...getFloatingProps({})}
    >
      {!isEdit ? (
        <EditLinkButton onClick={handleEdit} />
      ) : (
        <Input
          endAdornment={<SaveAdornment onSave={handleSave} />}
          ref={inputRef}
          value={linkUrl}
          onChange={event => {
            setLinkUrl(event.target.value);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleSave();
            } else if (event.key === 'Escape') {
              event.preventDefault();
            }
          }}
        />
      )}
    </Popper>
  );
}
