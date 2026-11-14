import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
  HISTORY_MERGE_TAG,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor
} from 'lexical';
import { expect, test, vi } from 'vitest';
import { registerDirtyTracker } from '../DirtyTrackerExtension';

function appendParagraph(editor: LexicalEditor, text: string, tag?: string) {
  editor.update(
    () => {
      $getRoot().append($createParagraphNode().append($createTextNode(text)));
    },
    { discrete: true, tag }
  );
}

test('tracks edits and undo/redo but not hydration or the initial load', async () => {
  const editor = createEditor({
    namespace: 'dirty-tracker-test',
    onError: error => {
      throw error;
    }
  });
  const markDirty = vi.fn();
  const unregisterHistory = registerHistory(editor, createEmptyHistoryState(), 0);
  const unregisterTracker = registerDirtyTracker(editor, markDirty);

  appendParagraph(editor, 'Initial load');
  appendParagraph(editor, 'Hydrated', HISTORY_MERGE_TAG);
  expect(markDirty).not.toHaveBeenCalled();

  appendParagraph(editor, 'Typed');
  expect(markDirty).toHaveBeenCalledOnce();

  // After a save, undo/redo can restore content that is not saved anywhere.
  // History commands commit their editor state asynchronously.
  markDirty.mockClear();
  editor.dispatchCommand(UNDO_COMMAND, undefined);
  await vi.waitFor(() => expect(markDirty).toHaveBeenCalledOnce());
  editor.dispatchCommand(REDO_COMMAND, undefined);
  await vi.waitFor(() => expect(markDirty).toHaveBeenCalledTimes(2));

  unregisterTracker();
  unregisterHistory();
});
