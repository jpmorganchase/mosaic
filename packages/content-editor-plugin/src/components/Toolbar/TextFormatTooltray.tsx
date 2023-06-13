import React, { useCallback, useEffect, useState } from 'react';
import classnames from 'clsx';
import {
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  $getSelection,
  $isRangeSelection,
  TextFormatType
} from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $isListNode, ListNode } from '@lexical/list';
import { $getNearestNodeOfType } from '@lexical/utils';
import { $isHeadingNode } from '@lexical/rich-text';
import { $isCodeNode } from '@lexical/code';
import { Icon } from '@jpmorganchase/mosaic-components';

import { Tooltray } from '@salt-ds/lab';
import { TextFormatToolbarButton } from './TextFormatToolbarButton';
import styles from './TextFormatTooltray.css';
import { InsertBlockDropdown } from './InsertBlockDropdown';

export function TextFormatTooltray({ floating = false }) {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [blockType, setBlockType] = useState<string>('paragraph');

  const handleFormat = (format: TextFormatType) => {
    activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsCode(selection.hasFormat('code'));

      const anchorNode = selection.anchor.getNode();
      const element =
        anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow();
      const elementKey = element.getKey();
      const elementDOM = activeEditor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType<ListNode>(anchorNode, ListNode);
          const type = parentList ? parentList.getListType() : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element) ? element.getTag() : element.getType();
          if (type) {
            setBlockType(type);
          }
          if ($isCodeNode(element)) {
            setIsCode(true);
          }
        }
      }
    }
  }, [activeEditor]);

  useEffect(
    () =>
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),

    [activeEditor, updateToolbar]
  );

  useEffect(
    () =>
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        (_payload, newEditor) => {
          updateToolbar();
          setActiveEditor(newEditor);
          return false;
        },
        COMMAND_PRIORITY_CRITICAL
      ),
    [editor, updateToolbar]
  );

  return (
    <div>
      {!floating ? <span /> : null}
      <Tooltray data-collapsible="instant">
        {!floating && <InsertBlockDropdown editor={activeEditor} type={blockType} />}
        <TextFormatToolbarButton active={isBold} onClick={() => handleFormat('bold')} label="Bold">
          <span className={classnames(styles.icon, styles.bold)}>B</span>
        </TextFormatToolbarButton>
        <TextFormatToolbarButton
          active={isItalic}
          onClick={() => handleFormat('italic')}
          label="Italic"
        >
          <span className={classnames(styles.icon, styles.italic)}>I</span>
        </TextFormatToolbarButton>
        <TextFormatToolbarButton
          active={isCode}
          onClick={() => handleFormat('code')}
          label="Inline Code"
        >
          <span className={classnames(styles.code)}>
            <Icon name="chevronLeft" />
            <Icon name="chevronRight" />
          </span>
        </TextFormatToolbarButton>
      </Tooltray>
    </div>
  );
}
