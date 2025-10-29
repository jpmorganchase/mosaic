import { $getSelection, $isRangeSelection, RangeSelection } from 'lexical';
import { ChangeEvent, useCallback, useEffect, useState } from 'react';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useFloatingUI, Input } from '@salt-ds/core';
import { useDismiss, useInteractions } from '@floating-ui/react';

import styles from './LinkEditor.css';
import { SaveAdornment } from './SaveAdornment';
import { EditLinkButton } from './EditLinkButton';
import { Popper } from '../Popper/Popper';
import { getSelectedNode } from '../../utils/getSelectedNode';

export function LinkEditor() {
  const [editor] = useLexicalComposerContext();
  const [linkUrl, setLinkUrl] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [lastSelection, setLastSelection] = useState<RangeSelection | null>(null);

  const reset = () => {
    setLinkUrl('');
    setIsEdit(false);
    setLastSelection(null);
  };

  const { context, floating, reference, strategy, x, y, elements } = useFloatingUI({
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
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateLinkEditor();
        });
      }),
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
      {...getFloatingProps({})}
      top={y ?? 0}
      left={x ?? 0}
      position={strategy}
      width={elements.floating?.offsetWidth}
      height={elements.floating?.offsetHeight}
    >
      {!isEdit ? (
        <EditLinkButton onClick={handleEdit} />
      ) : (
        <Input
          endAdornment={<SaveAdornment onSave={handleSave} />}
          value={linkUrl}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
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
