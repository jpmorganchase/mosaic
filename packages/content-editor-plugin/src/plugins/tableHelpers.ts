import { $isElementNode, $isTextNode, type ElementNode } from 'lexical';
import { type TableCellNode, type TableSelection } from '@lexical/table';
/**
 * Helpers for {@link TableActionMenuPlugin}. Pure Lexical-side
 * functions that don't touch React or DOM — kept here so they can
 * be unit-tested headlessly and so the plugin file stays focused
 * on UI orchestration.
 *
 * Several mirror upstream playground helpers
 * (`packages/lexical-playground/src/plugins/TableActionMenuPlugin/index.tsx`).
 * The mirrored set is deliberately small; we do NOT re-implement
 * `TableObserver` / `$clearHighlight()` because we don't ship the
 * cell-drag highlight overlay or the resize handle that drive
 * those code paths.
 */
/**
 * Derive the `{rows, columns}` extent of a `TableSelection` from
 * its shape. Mirrors upstream's `computeSelectionCount`.
 * `getShape()` returns a `{fromX, toX, fromY, toY}` rectangle in
 * cell coordinates; the +1 turns an inclusive range into a count.
 */
export function computeSelectionCount(selection: TableSelection): {
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
 * Drop the caret at the end of `node`. Mirrors upstream's
 * `$selectLastDescendant`. Used after a merge so the editor
 * selection lives inside the surviving (merged) cell rather than
 * at one of the just-removed cells.
 */
export function $selectLastDescendant(node: ElementNode): void {
  const last = node.getLastDescendant();
  if ($isTextNode(last)) {
    last.select();
  } else if ($isElementNode(last)) {
    last.selectEnd();
  } else if (last !== null) {
    last.selectNext();
  }
}
/**
 * Whether a cell is currently merged (occupies > 1 row or column).
 * Drives the "Unmerge Cells" availability gate.
 */
export function isMergedCell(cell: TableCellNode): boolean {
  const rowSpan = cell.getRowSpan();
  const colSpan = cell.getColSpan();
  return (rowSpan ?? 1) > 1 || (colSpan ?? 1) > 1;
}
