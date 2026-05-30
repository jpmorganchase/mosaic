import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
  type ElementNode,
  LexicalEditor
} from 'lexical';
import {
  $deleteTableColumnAtSelection,
  $deleteTableRowAtSelection,
  $getTableCellNodeFromLexicalNode,
  $getTableNodeFromLexicalNodeOrThrow,
  $insertTableColumnAtSelection,
  $insertTableRowAtSelection,
  $isTableCellNode,
  $isTableSelection,
  $mergeCells,
  $unmergeCell,
  TableCellNode,
  type TableSelection
} from '@lexical/table';
import { useFloatingUI } from '@salt-ds/core';
import { useDismiss, useInteractions } from '@floating-ui/react';

import { Popper } from '../components/Popper/Popper';
import { ActionMenu, ActionMenuItem, ActionMenuSource } from '../components/ActionMenu/ActionMenu';
import styles from './TableActionMenuPlugin.css';

/**
 * Modernized in May-2026 to use the upstream `@lexical/table`
 * `*AtSelection` helper family (introduced ~0.40 and now the
 * official API) and to expose cell merge / unmerge. A second pass
 * added selection-aware multi-row/column inserts and post-merge
 * caret placement so the plugin's behaviour matches upstream's
 * `packages/lexical-playground/src/plugins/TableActionMenuPlugin/index.tsx`
 * to the extent that's possible without the full TableObserver
 * infrastructure (see "Why no TableObserver" below).
 *
 * Selection-aware inserts
 * -----------------------
 * If the user drag-selects three rows and clicks "Insert Row Below",
 * we insert three rows below the selection, not one. We derive the
 * count from `TableSelection.getShape()` — exactly the formula
 * upstream's `computeSelectionCount` uses. RangeSelection (single
 * caret) yields a count of 1, which is the same as a no-op
 * single-cell selection. See `computeSelectionCount` below.
 *
 * Merge / unmerge
 * ---------------
 * `$mergeCells(cells)` requires a {@link TableSelection} (the
 * multi-cell drag selection state), not a normal `RangeSelection`.
 * We therefore enable the merge entry only while the selection IS
 * a TableSelection covering more than one cell. Unmerge is the
 * reverse — only meaningful on a cell that was previously merged.
 *
 * After a successful merge we walk the target cell's last
 * descendant and place the caret there (mirroring upstream's
 * `$selectLastDescendant`) so the user can immediately type into
 * the merged region. Without this, the editor selection ends up
 * pointing at one of the now-removed cells, which collapses to
 * nothing on the next update tick — visually the merge "loses
 * focus" and the user has to click back in.
 *
 * Why no TableObserver
 * --------------------
 * Upstream's `TableActionMenuPlugin` calls
 * `getTableObserverFromTableElement(...)` for two reasons:
 *   1. `$clearHighlight()` after destructive ops (drops the blue
 *      multi-cell highlight overlay rectangle).
 *   2. Awareness of the cell-resize handle state.
 * Both rely on `registerTableSelectionObserver` being mounted
 * elsewhere (the playground does this via `TableCellResizer` and
 * a global `TableObserver` install). We don't ship either of
 * those features today — there is no resize handle and no cell-
 * drag highlight overlay in our editor — so installing the
 * observer would only register listeners with nothing to drive.
 * If we add cell-drag selection visuals in a future pass, the
 * observer goes in then and `$clearHighlight()` lands here.
 *
 * Why we still own the Popper
 * ---------------------------
 * Upstream's playground attaches the menu trigger to the cell's
 * top-right corner via inline `transform`; we keep our existing
 * Floating-UI-based Popper because (a) it's already integrated
 * with Salt's design tokens via `useFloatingUI`, and (b) the
 * "cell hover" affordance (focus ring + adjacent menu) was
 * already wired through `anchorEl`.
 */

/**
 * `computeSelectionCount` — derive the {rows, columns} extent of a
 * TableSelection from its shape. Mirrors upstream's helper of the
 * same name (`packages/lexical-playground/src/plugins/TableActionMenuPlugin/index.tsx`
 * line 56-65). `getShape()` returns a `{fromX, toX, fromY, toY}`
 * rectangle in cell coordinates; the +1 turns an inclusive range
 * into a count.
 */
function computeSelectionCount(selection: TableSelection): {
  columns: number;
  rows: number;
} {
  const shape = selection.getShape();
  return {
    columns: shape.toX - shape.fromX + 1,
    rows: shape.toY - shape.fromY + 1
  };
}

/**
 * `$selectLastDescendant` — drop the caret at the end of `node`.
 * Mirrors upstream's helper of the same name. Used after a merge
 * so the editor selection lives inside the surviving (merged) cell
 * rather than at one of the just-removed cells. Walks once through
 * the last-descendant chain and dispatches the appropriate select
 * call for the node type we land on.
 */
function $selectLastDescendant(node: ElementNode): void {
  const last = node.getLastDescendant();
  if ($isTextNode(last)) {
    last.select();
  } else if ($isElementNode(last)) {
    last.selectEnd();
  } else if (last !== null) {
    last.selectNext();
  }
}

interface TableMenuItem extends ActionMenuItem {
  /** Disabled when not applicable to the current selection. */
  disabled?: boolean;
}

interface MenuState {
  canMerge: boolean;
  canUnmerge: boolean;
  /** How many rows the current selection spans (1 for caret). */
  rows: number;
  /** How many columns the current selection spans (1 for caret). */
  columns: number;
}

const baseMenuItems: ActionMenuSource = [
  { title: 'Insert Row Above', icon: 'arrowUp' },
  { title: 'Insert Row Below', icon: 'arrowDown' },
  { title: 'Insert Column Left', icon: 'arrowLeft' },
  { title: 'Insert Column Right', icon: 'arrowRight' },
  { title: 'Merge Cells', icon: 'tile' },
  { title: 'Unmerge Cells', icon: 'tile' },
  { title: 'Delete Row', icon: 'delete' },
  { title: 'Delete Column', icon: 'delete' },
  { title: 'Delete Table', icon: 'deleteSolid' }
];

interface TableActionMenuProps {
  editor: LexicalEditor;
  tableCellNode: TableCellNode | null;
  menuState: MenuState;
  onComplete: () => void;
}

function TableActionMenu({ editor, tableCellNode, menuState, onComplete }: TableActionMenuProps) {
  /**
   * Build the menu items list each render so the disabled state of
   * Merge / Unmerge reflects the live selection. Filtering items
   * out entirely would shift the menu's visual height as the user
   * moves between cells, which is more distracting than greying
   * them out.
   */
  const items: TableMenuItem[] = useMemo(
    () =>
      baseMenuItems.map(item => {
        if (item.title === 'Merge Cells') {
          return { ...item, disabled: !menuState.canMerge };
        }
        if (item.title === 'Unmerge Cells') {
          return { ...item, disabled: !menuState.canUnmerge };
        }
        return item;
      }),
    [menuState.canMerge, menuState.canUnmerge]
  );

  const insertRow = useCallback(
    (after: boolean) => {
      editor.update(() => {
        // Multi-select aware: insert as many rows as the user has
        // selected. Each call walks the current selection to find
        // its insertion point, so looping is safe.
        for (let i = 0; i < menuState.rows; i += 1) {
          $insertTableRowAtSelection(after);
        }
      });
      onComplete();
    },
    [editor, menuState.rows, onComplete]
  );

  const insertColumn = useCallback(
    (after: boolean) => {
      editor.update(() => {
        for (let i = 0; i < menuState.columns; i += 1) {
          $insertTableColumnAtSelection(after);
        }
      });
      onComplete();
    },
    [editor, menuState.columns, onComplete]
  );

  const deleteRow = useCallback(() => {
    editor.update(() => {
      $deleteTableRowAtSelection();
    });
    onComplete();
  }, [editor, onComplete]);

  const deleteColumn = useCallback(() => {
    editor.update(() => {
      $deleteTableColumnAtSelection();
    });
    onComplete();
  }, [editor, onComplete]);

  const deleteTable = useCallback(() => {
    editor.update(() => {
      if (tableCellNode && $isTableCellNode(tableCellNode)) {
        const tableNode = $getTableNodeFromLexicalNodeOrThrow(tableCellNode);
        tableNode.remove();
      }
    });
    onComplete();
  }, [editor, tableCellNode, onComplete]);

  const mergeCells = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isTableSelection(selection)) return;
      const cells = selection.getNodes().filter($isTableCellNode);
      // `$mergeCells` returns the target cell that swallowed the
      // others (or null if the selection was a single cell, which
      // we already gate against via canMerge). Drop the caret at
      // the end of that cell so the user keeps an editing context
      // — otherwise the selection ends up pointing at one of the
      // now-removed cells and visually "vanishes".
      const targetCell = $mergeCells(cells);
      if (targetCell) {
        $selectLastDescendant(targetCell);
      }
    });
    onComplete();
  }, [editor, onComplete]);

  const unmergeCells = useCallback(() => {
    editor.update(() => {
      $unmergeCell();
    });
    onComplete();
  }, [editor, onComplete]);

  const handleMenuSelect = (item: ActionMenuItem) => {
    if (!item) return;
    // Defensive: disabled items can still be reported by some
    // ActionMenu implementations. Drop the action if the user
    // somehow triggered a disabled entry.
    const live = items.find(i => i.title === item.title);
    if (live?.disabled) return;

    switch (item.title) {
      case 'Insert Row Above':
        return insertRow(false);
      case 'Insert Row Below':
        return insertRow(true);
      case 'Insert Column Left':
        return insertColumn(false);
      case 'Insert Column Right':
        return insertColumn(true);
      case 'Merge Cells':
        return mergeCells();
      case 'Unmerge Cells':
        return unmergeCells();
      case 'Delete Row':
        return deleteRow();
      case 'Delete Column':
        return deleteColumn();
      case 'Delete Table':
        return deleteTable();
      default:
        return undefined;
    }
  };

  return <ActionMenu items={items} onItemClick={handleMenuSelect} />;
}

export function TableActionMenuPlugin() {
  const [editor] = useLexicalComposerContext();
  const [tableCellNode, setTableMenuCellNode] = useState<TableCellNode | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [menuState, setMenuState] = useState<MenuState>({
    canMerge: false,
    canUnmerge: false,
    rows: 1,
    columns: 1
  });
  const { context, floating, reference, strategy, x, y, elements } = useFloatingUI({
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

  /**
   * Recompute the menu's anchor cell, position, and selection-
   * derived state (merge / unmerge availability). Mirrors upstream's
   * `$moveMenu` but with our Floating-UI positioning instead of
   * inline transforms.
   */
  const updatePosition = useCallback(() => {
    const selection = $getSelection();
    const nativeSelection = window.getSelection();
    const { activeElement } = document;

    if (selection == null) {
      setTableMenuCellNode(null);
      return;
    }

    let anchorCell: TableCellNode | null = null;
    let tableSelectionCellCount = 0;
    let selectionRows = 1;
    let selectionColumns = 1;

    if ($isTableSelection(selection)) {
      // Multi-cell drag selection. Use the selection's anchor cell
      // to position the menu, capture the cell count for the merge
      // gate, and capture the row/column extent for selection-aware
      // inserts ("Insert 3 rows above" when 3 are selected).
      const tableSelection: TableSelection = selection;
      const anchorNode = tableSelection.anchor.getNode();
      anchorCell = $getTableCellNodeFromLexicalNode(anchorNode);
      tableSelectionCellCount = tableSelection.getNodes().filter($isTableCellNode).length;
      const counts = computeSelectionCount(tableSelection);
      selectionRows = counts.rows;
      selectionColumns = counts.columns;
    } else if (
      $isRangeSelection(selection) &&
      editor.getRootElement() !== null &&
      nativeSelection !== null &&
      editor.getRootElement()!.contains(nativeSelection.anchorNode)
    ) {
      anchorCell = $getTableCellNodeFromLexicalNode(selection.anchor.getNode());
    } else if (!activeElement) {
      setTableMenuCellNode(null);
      return;
    }

    if (anchorCell == null) {
      setTableMenuCellNode(null);
      return;
    }

    const tableCellParentNodeDOM = editor.getElementByKey(anchorCell.getKey());
    if (tableCellParentNodeDOM == null) {
      setTableMenuCellNode(null);
      return;
    }

    // Selection-derived menu state. A cell is "merged" when it has
    // a row-span OR col-span greater than 1; unmerge then becomes
    // applicable. Merge is only applicable when the user has a
    // TableSelection covering more than one distinct cell.
    const rowSpan = anchorCell.getRowSpan();
    const colSpan = anchorCell.getColSpan();
    const isMerged = (rowSpan ?? 1) > 1 || (colSpan ?? 1) > 1;

    setMenuState({
      canMerge: tableSelectionCellCount > 1,
      canUnmerge: isMerged,
      rows: selectionRows,
      columns: selectionColumns
    });

    tableCellParentNodeDOM.classList.add(...styles.focused);
    setTableMenuCellNode(anchorCell);
    reference(tableCellParentNodeDOM);
    setAnchorEl(tableCellParentNodeDOM);
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
      {...getFloatingProps({})}
      top={y ?? 0}
      left={x ?? 0}
      position={strategy}
      width={elements.floating?.offsetWidth}
      height={elements.floating?.offsetHeight}
    >
      <TableActionMenu
        editor={editor}
        tableCellNode={tableCellNode}
        menuState={menuState}
        onComplete={handleComplete}
      />
    </Popper>
  );
}
