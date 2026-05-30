import { ElementTransformer, type Transformer } from '@lexical/markdown';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import type { LexicalNode } from 'lexical';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode
} from '@lexical/table';
import { $isParagraphNode, $isTextNode } from 'lexical';

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;

/**
 * `isTableRowDivider` — line-shape detector for the markdown row
 * `| --- | --- |` (optional alignment colons; any number of dashes).
 *
 * Why we hand-roll this instead of importing from `@lexical/markdown`:
 * upstream's `main` branch exports an `isTableRowDivider` helper,
 * but `@lexical/markdown@0.45.0` (our pinned version) does NOT —
 * we verified at runtime that the export is `undefined` in 0.45.
 * When a future release ships it, we can swap our local impl for
 * the upstream one.
 *
 * Faithful-port note: this entire file mirrors the structure of
 * `packages/lexical-playground/src/plugins/MarkdownTransformers/index.ts`
 * `TABLE` transformer (upstream `main`). Differences from upstream:
 *   - we own the row-divider detector (see above);
 *   - we late-bind the cell transformer registry via a setter to
 *     break the import cycle that upstream avoids by colocating
 *     the registry in the same file;
 *   - both upstream and ours use the classic ElementTransformer
 *     type (NOT MultilineElementTransformer); the multiline
 *     element transformers exported by @lexical/markdown are for
 *     fenced code blocks, not tables.
 */
const TABLE_DIVIDER_LINE_REG_EXP = /^\|\s*(?::?-{3,}:?\s*\|\s*)+$/;
const isTableRowDivider = (line: string): boolean => TABLE_DIVIDER_LINE_REG_EXP.test(line.trim());

// Forward-declared so $createTableCell can reference the shared
// transformer registry without import cycles. Filled in below
// after TABLE_RULE is exported. Typed as `Transformer[]` (not
// `ElementTransformer[]`) so that inline formatting via
// TEXT_FORMAT / TEXT_MATCH transformers also round-trips inside
// cells — restricting to ElementTransformer would drop bold,
// italic, code, and inline-link parsing inside table cells.
let TRANSFORMERS_FOR_CELLS: Transformer[] | null = null;

const $createTableCell = (textContent: string): TableCellNode => {
  // Upstream encodes literal newlines as `\\n` in the markdown
  // (so a multi-line cell can sit on a single source line); decode
  // before parsing.
  const decoded = textContent.replace(/\\n/g, '\n').trim();
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  if (TRANSFORMERS_FOR_CELLS) {
    // Parse inline markdown so bold/italic/links inside cells
    // round-trip via the shared transformer set rather than the
    // single hard-coded link case the old transformer had.
    $convertFromMarkdownString(decoded, TRANSFORMERS_FOR_CELLS, cell);
  }
  return cell;
};

const mapToTableCells = (textContent: string): TableCellNode[] | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);
  if (!match || !match[1]) return null;
  return match[1].split('|').map(text => $createTableCell(text));
};

function getTableColumnsSize(table: TableNode): number {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

export const TABLE_RULE: ElementTransformer = {
  dependencies: [TableNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) return null;

    const output: string[] = [];
    for (const row of node.getChildren()) {
      if (!$isTableRowNode(row)) continue;

      const rowOutput: string[] = [];
      let isHeaderRow = false;
      for (const cell of row.getChildren()) {
        if ($isTableCellNode(cell)) {
          if (TRANSFORMERS_FOR_CELLS) {
            // Encode literal newlines so the cell stays on a single
            // markdown line; the importer reverses the encoding.
            rowOutput.push(
              $convertToMarkdownString(TRANSFORMERS_FOR_CELLS, cell).replace(/\n/g, '\\n').trim()
            );
          } else {
            rowOutput.push(cell.getTextContent().replace(/\n/g, '\\n').trim());
          }
          if (cell.__headerState === TableCellHeaderStates.ROW) {
            isHeaderRow = true;
          }
        }
      }

      output.push(`| ${rowOutput.join(' | ')} |`);
      // Emit the divider line right after the row that carries the
      // header marker. Crucially we only do this when the table
      // actually has a header row — the old transformer fabricated
      // one for every table, which broke round-trip for tables
      // without headers.
      if (isHeaderRow) {
        output.push(`| ${rowOutput.map(() => '---').join(' | ')} |`);
      }
    }

    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _children, match) => {
    // Divider line — promote the previously-built table's last row
    // to header cells, then remove this paragraph.
    if (isTableRowDivider(match[0])) {
      const table = parentNode.getPreviousSibling();
      if (!table || !$isTableNode(table)) return;

      const rows = table.getChildren();
      const lastRow = rows[rows.length - 1];
      if (!lastRow || !$isTableRowNode(lastRow)) return;

      for (const cell of lastRow.getChildren()) {
        if ($isTableCellNode(cell)) {
          cell.setHeaderStyles(TableCellHeaderStates.ROW, TableCellHeaderStates.ROW);
        }
      }
      parentNode.remove();
      return;
    }

    const matchCells = mapToTableCells(match[0]);
    if (matchCells == null) return;

    // Walk backwards through prior paragraphs that look like
    // `| ... |` rows and pull them into the same table. This is
    // what makes a stack of standalone row-paragraphs cohere into
    // one TableNode without needing MULTILINE_ELEMENT_TRANSFORMERS.
    const rows: TableCellNode[][] = [matchCells];
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling)) break;
      if (sibling.getChildrenSize() !== 1) break;
      const firstChild = sibling.getFirstChild();
      if (!$isTextNode(firstChild)) break;

      const cells = mapToTableCells(firstChild.getTextContent());
      if (cells == null) break;

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = $createTableNode();
    for (const cells of rows) {
      const tableRow = $createTableRowNode();
      table.append(tableRow);
      for (let i = 0; i < maxCells; i += 1) {
        tableRow.append(i < cells.length ? cells[i] : $createTableCell(''));
      }
    }

    // If the immediately preceding sibling is already a table with
    // the same column count, append into it instead of creating a
    // new one. Lets the user type extra rows directly under an
    // existing table without producing two adjacent tables.
    const previousSibling = parentNode.getPreviousSibling();
    if ($isTableNode(previousSibling) && getTableColumnsSize(previousSibling) === maxCells) {
      previousSibling.append(...table.getChildren());
      parentNode.remove();
    } else {
      parentNode.replace(table);
    }

    table.selectEnd();
  },
  type: 'element'
};

/**
 * Late-bound setter used by `transformers/index.ts` to give the
 * table transformer access to the full transformer registry for
 * recursive cell parsing/serialization. Doing this via a setter
 * (rather than importing the registry directly) keeps the import
 * graph acyclic: `tableRule.ts → index.ts → tableRule.ts` would
 * otherwise be a cycle.
 */
export const setTableCellTransformers = (transformers: Transformer[]): void => {
  TRANSFORMERS_FOR_CELLS = transformers;
};
