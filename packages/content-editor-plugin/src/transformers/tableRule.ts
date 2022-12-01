import { ElementTransformer } from '@lexical/markdown';
import type { ElementNode, LexicalNode } from 'lexical';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableNode,
  $isTableRowNode,
  TableCellHeaderStates,
  TableCellNode,
  TableNode,
  TableRowNode
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $isElementNode,
  $isParagraphNode,
  $isTextNode
} from 'lexical';

import LINK_TRANSFORMER from './link';

const TABLE_ROW_REG_EXP = /^(?:\|)(.+)(?:\|)\s?$/;
const TABLE_HEADER_REG_EXP = /(---)/;

export const TABLE_RULE: ElementTransformer = {
  dependencies: [TableNode, TableRowNode, TableCellNode],
  export: (node: LexicalNode, exportChildren: (elementNode: ElementNode) => string) => {
    if (!$isTableNode(node)) {
      return null;
    }

    const output: string[] = [];
    let columnCount: number | null = null;

    // eslint-disable-next-line no-restricted-syntax
    for (const row of node.getChildren()) {
      const rowOutput: string[] = [];

      if ($isTableRowNode(row)) {
        // eslint-disable-next-line no-restricted-syntax
        for (const cell of row.getChildren()) {
          if ($isElementNode(cell)) {
            rowOutput.push(exportChildren(cell));
          }
        }
        if (columnCount === null) {
          columnCount = rowOutput.length;
        }
      }
      output.push(`| ${rowOutput.join(' | ')} |`);
    }
    addHeaderDividerToOutput(output, columnCount);
    return output.join('\n');
  },
  regExp: TABLE_ROW_REG_EXP,
  replace: (parentNode, _1, match) => {
    const matchCells = mapToTableCells(match[0]);

    if (matchCells == null) {
      return;
    }

    const rows = handleHeaderDashes(matchCells);
    let sibling = parentNode.getPreviousSibling();
    let maxCells = matchCells.length;

    while (sibling) {
      if (!$isParagraphNode(sibling)) {
        break;
      }

      if (sibling.getChildrenSize() !== 1) {
        break;
      }

      const firstChild = sibling.getFirstChild();

      if (!$isTextNode(firstChild)) {
        break;
      }

      const cells = mapToTableCells(firstChild.getTextContent());

      if (cells == null) {
        break;
      }

      maxCells = Math.max(maxCells, cells.length);
      rows.unshift(cells);
      const previousSibling = sibling.getPreviousSibling();
      sibling.remove();
      sibling = previousSibling;
    }

    const table = createTableNode(rows, maxCells);

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

function getTableColumnsSize(table: TableNode) {
  const row = table.getFirstChild();
  return $isTableRowNode(row) ? row.getChildrenSize() : 0;
}

const createTableCell = (textContent: string | null | undefined): TableCellNode => {
  const cell = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
  const paragraph = $createParagraphNode();

  if (textContent != null) {
    const textNode = $createTextNode(textContent.trim());
    paragraph.append(textNode);
    /**
     * Table cells are treated as text only.
     * However, it is very common to see links inside tables
     * so we check if the content is a markdown link and render a link accordingly
     */
    const linkMatch = textContent.trim().match(LINK_TRANSFORMER.regExp);
    if (linkMatch) {
      LINK_TRANSFORMER.replace(textNode, linkMatch);
    }
  }

  cell.append(paragraph);
  return cell;
};

const mapToTableCells = (textContent: string): Array<TableCellNode> | null => {
  const match = textContent.match(TABLE_ROW_REG_EXP);

  if (!match || !match[1]) {
    return null;
  }

  return match[1].split('|').map(text => createTableCell(text));
};

const addHeaderDividerToOutput = (output: string[], columnCount?: number | null) => {
  let divider = '';

  if (!columnCount) {
    return output;
  }
  for (let i = 0; i < columnCount + 1; i++) {
    divider = divider.concat('|');

    if (i < columnCount) {
      divider = divider.concat('----');
    }
  }

  const headerMatch = output[1]?.match(TABLE_HEADER_REG_EXP);
  if (headerMatch) {
    // output already has the header dashes
    return output;
  }
  return output.splice(1, 0, divider);
};

/**
 * if a table has the markdown dashes then
 * we don't want to render them as part of the table
 */
const handleHeaderDashes = (matchCells: TableCellNode[]) => {
  const test = matchCells[0].getFirstChild()?.getTextContent();
  const headerMatch = test?.match(TABLE_HEADER_REG_EXP);
  return headerMatch === null ? [matchCells] : [];
};

const createTableNode = (rows: TableCellNode[][], maxCells: number) => {
  const table = $createTableNode();
  // eslint-disable-next-line no-restricted-syntax
  for (const cells of rows) {
    const tableRow = $createTableRowNode();
    table.append(tableRow);

    for (let i = 0; i < maxCells; i++) {
      tableRow.append(i < cells.length ? cells[i] : createTableCell(null));
    }
  }
  return table;
};
