import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  COMMAND_PRIORITY_CRITICAL
} from 'lexical';
import { mergeRegister } from '@lexical/utils';

export function useEditHistory() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(
    () =>
      mergeRegister(
        editor.registerCommand<boolean>(
          CAN_UNDO_COMMAND,
          payload => {
            setCanUndo(payload);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL
        ),
        editor.registerCommand<boolean>(
          CAN_REDO_COMMAND,
          payload => {
            setCanRedo(payload);
            return false;
          },
          COMMAND_PRIORITY_CRITICAL
        )
      ),
    [editor]
  );

  const undoEdit = useCallback(() => editor.dispatchCommand(UNDO_COMMAND, undefined), [editor]);
  const redoEdit = useCallback(() => editor.dispatchCommand(REDO_COMMAND, undefined), [editor]);

  return {
    canRedo,
    canUndo,
    undoEdit,
    redoEdit
  };
}
