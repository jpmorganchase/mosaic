import { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, LexicalEditor } from 'lexical';
import {
  $deleteTableColumn,
  $getElementGridForTableNode,
  $getTableCellNodeFromLexicalNode,
  $getTableColumnIndexFromTableCellNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $getTableRowIndexFromTableCellNode,
  $insertTableColumn,
  $insertTableRow,
  $isTableCellNode,
  $removeTableRowAtIndex,
  TableCellNode
} from '@lexical/table';
import { useFloatingUI } from '@salt-ds/core';
import { useDismiss, useInteractions } from '@floating-ui/react';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  DeleteIcon,
  DeleteSolidIcon
} from '@salt-ds/icons';
import type { MenuDescriptor } from '@salt-ds/lab';

import { Popper } from '../components/Popper/Popper';
import { ActionMenu, ActionMenuSource } from '../components/ActionMenu/ActionMenu';
import styles from './TableActionMenuPlugin.css';

const initialSource: ActionMenuSource = {
  menuItems: [
    {
      title: 'Insert Row Above',
      icon: ArrowUpIcon
    },
    {
      title: 'Insert Row Below',
      icon: ArrowDownIcon
    },
    {
      title: 'Insert Column Left',
      icon: ArrowLeftIcon
    },
    {
      title: 'Insert Column Right',
      icon: ArrowRightIcon
    },
    {
      title: 'Delete Row',
      icon: DeleteIcon
    },
    {
      title: 'Delete Column',
      icon: DeleteIcon
    },
    {
      title: 'Delete Table',
      icon: DeleteSolidIcon
    }
  ]
};

interface TableActionMenuProps {
  editor: LexicalEditor;
  tableCellNode: TableCellNode | null;
  onComplete: () => void;
}

function TableActionMenu({ editor, tableCellNode, onComplete }: TableActionMenuProps) {
  const handleMenuSelect = (item: MenuDescriptor | null) => {
    if (!item) {
      return;
    }
    if (item.title === 'Delete Row') {
      deleteTableRowAtSelection();
      return;
    }

    if (item.title === 'Insert Row Below') {
      insertTableRow(true);
      return;
    }

    if (item.title === 'Insert Row Above') {
      insertTableRow(false);
      return;
    }

    if (item.title === 'Insert Column Left') {
      insertTableColumn(false);
      return;
    }

    if (item.title === 'Insert Column Right') {
      insertTableColumn(true);
      return;
    }

    if (item.title === 'Delete Column') {
      deleteTableColumnAtSelection();
      return;
    }
    if (item.title === 'Delete Table') {
      deleteTable();
    }
  };

  const deleteTableRowAtSelection = useCallback(() => {
    editor.update(() => {
      if ($isTableCellNode(tableCellNode)) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);

        $removeTableRowAtIndex(tableNode, tableRowIndex);
        onComplete();
      }
    });
  }, [editor, onComplete, tableCellNode]);

  const insertTableRow = useCallback(
    shouldInsertAfter => {
      editor.update(() => {
        if ($isTableCellNode(tableCellNode)) {
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const tableRowIndex = $getTableRowIndexFromTableCellNode(tableCellNode);
          const grid = $getElementGridForTableNode(editor, tableNode);

          $insertTableRow(tableNode, tableRowIndex, shouldInsertAfter, 1, grid);
        }

        onComplete();
      });
    },
    [editor, tableCellNode, onComplete]
  );

  const insertTableColumn = useCallback(
    shouldInsertAfter => {
      editor.update(() => {
        if ($isTableCellNode(tableCellNode)) {
          const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
          const tableColumnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
          const grid = $getElementGridForTableNode(editor, tableNode);

          $insertTableColumn(tableNode, tableColumnIndex, shouldInsertAfter, 1, grid);
        }
        onComplete();
      });
    },
    [editor, tableCellNode, onComplete]
  );

  const deleteTableColumnAtSelection = useCallback(() => {
    editor.update(() => {
      if ($isTableCellNode(tableCellNode)) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        const tableColumnIndex = $getTableColumnIndexFromTableCellNode(tableCellNode);
        $deleteTableColumn(tableNode, tableColumnIndex);
        onComplete();
      }
    });
  }, [editor, tableCellNode, onComplete]);

  const deleteTable = useCallback(() => {
    editor.update(() => {
      if ($isTableCellNode(tableCellNode)) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        tableNode.remove();
        onComplete();
      }
    });
  }, [editor, tableCellNode, onComplete]);

  return <ActionMenu initialSource={initialSource} onItemClick={handleMenuSelect} />;
}

export function TableActionMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { context, floating, reference, strategy, x, y } = useFloatingUI({
    placement: 'right',
    strategy: 'absolute',
    open: tableCellNode !== null,
    onOpenChange: () => setTableMenuCellNode(null)
  });
  const { getFloatingProps } = useInteractions([
    useDismiss(context, {
      ancestorScroll: true
    })
  ]);

  const updatePosition = useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    const { activeElement } = document;

    if (selection == null) {
      setTableMenuCellNode(null);
      return;
    }

    const rootElement = editor.getRootElement();

    if (
      $isRangeSelection(selection) &&
      rootElement !== null &&
      nativeSelection !== null &&
      rootElement.contains(nativeSelection.anchorNode)
    ) {
      const tableCellNodeFromSelection = $getTableCellNodeFromLexicalNode(
        selection.anchor.getNode()
      );

      if (tableCellNodeFromSelection == null) {
        setTableMenuCellNode(null);
        return;
      }

      const tableCellParentNodeDOM = editor.getElementByKey(tableCellNodeFromSelection.getKey());

      if (tableCellParentNodeDOM == null) {
        setTableMenuCellNode(null);
        return;
      }

      tableCellParentNodeDOM.classList.add(...styles.focused);
      setTableMenuCellNode(tableCellNodeFromSelection);
      reference(tableCellParentNodeDOM);
      setAnchorEl(tableCellParentNodeDOM);
    } else if (!activeElement) {
      setTableMenuCellNode(null);
    }
  }, [editor, reference]);

  useEffect(
    () =>
      editor.registerUpdateListener(() => {
        editor.getEditorState().read(() => {
          updatePosition();
        });
      }),
    [editor, updatePosition]
  );

  useEffect(
    function applyFocusRing() {
      anchorEl?.classList.add(...styles.focused);
      return function removeFocusRing() {
        anchorEl?.classList.remove(...styles.focused);
      };
    },
    [anchorEl?.classList, tableCellNode]
  );

  const handleComplete = () => {
    setAnchorEl(null);
    setTableMenuCellNode(null);
  };

  return (
    <Popper
      ref={floating}
      open={tableCellNode !== null}
      style={{ top: y ?? '', left: x ?? '', position: strategy }}
      {...getFloatingProps({})}
    >
      <TableActionMenu editor={editor} tableCellNode={tableCellNode} onComplete={handleComplete} />
    </Popper>
  );
}
