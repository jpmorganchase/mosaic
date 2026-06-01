import {
  ElementTransformer,
  MultilineElementTransformer,
  type Transformer
} from '@lexical/markdown';
import { $convertFromMarkdownString, $convertToMarkdownString } from '@lexical/markdown';
import { $createLinkNode, $isLinkNode } from '@lexical/link';
import type { ElementNode, LexicalNode, TextFormatType } from 'lexical';
import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  $isTableCellNode,
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

const TABLE_ROW_REG_EXP = /^\|(.+)\|\s?$/;

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

/**
 * `$tableHasMergedCells` — true when any cell in the table carries
 * a `__colSpan` or `__rowSpan` greater than 1. Used as the gate
 * for HTML vs GFM export: GFM markdown has no syntax for cell
 * merging, so a merged table must round-trip as inline HTML or
 * the merge is silently dropped.
 */
function $tableHasMergedCells(table: TableNode): boolean {
  for (const row of table.getChildren()) {
    if (!$isTableRowNode(row)) continue;
    for (const cell of row.getChildren()) {
      if (!$isTableCellNode(cell)) continue;
      if ((cell.__colSpan ?? 1) > 1 || (cell.__rowSpan ?? 1) > 1) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Minimal JSX-safe text escape for cell content. MDX/JSX text
 * content treats `{` as the start of an expression, and `<` as the
 * start of a JSX tag — both will fail compilation if they appear
 * unescaped inside a cell. HTML entities (`&amp;`, `&lt;`, etc.)
 * are NOT decoded by MDX's JSX parser, so we deliberately do NOT
 * use them here; instead we replace the problem characters with
 * single-character JSX expressions, which the compiler evaluates
 * to the literal character. `>` is harmless in JSX text but we
 * escape it too for symmetry with `<`.
 */
function escapeJsxText(text: string): string {
  return text
    .replace(/\{/g, "{'{'}")
    .replace(/}/g, "{'}'}")
    .replace(/</g, "{'<'}")
    .replace(/>/g, "{'>'}");
}

/**
 * Escape for use as an HTML attribute value (double-quoted). Only
 * `"` and `&` need to be escaped to keep the attribute parseable;
 * `<` / `>` are allowed inside quoted attribute values per the
 * HTML spec. We use real HTML entities here (not JSX expressions)
 * because attribute values are parsed by MDX's tag parser, not as
 * JSX text — and MDX's tag parser DOES recognise standard HTML
 * entity references inside double-quoted attribute values.
 */
function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * `$serializeInlineCellContent` — convert a single block element's
 * inline children into a JSX/HTML fragment string. Handles the
 * subset of inline formatting our editor produces:
 *
 *   - `TextNode` with `bold`  → `<Strong>...</Strong>`
 *   - `TextNode` with `italic`→ `<Em>...</Em>`
 *   - `TextNode` with `code`  → `<Code>...</Code>`
 *   - `LinkNode`              → `<Link href="...">...</Link>`
 *   - Other element nodes     → recurse into children
 *
 * Marks compose: a bold-italic `TextNode` becomes
 * `<Strong><Em>...</Em></Strong>`. Order is fixed (bold outermost,
 * then italic, then code) so the import side can rely on a stable
 * nesting when re-parsing — and so visual styling is consistent
 * across cells.
 *
 * Why capitalised JSX names (`<Strong>`, `<Link>`) rather than
 * lowercase HTML (`<strong>`, `<a>`)?
 * MDX routes capitalised JSX identifiers through `props.components`
 * but treats lowercase tag names inside JSX-source as bare DOM,
 * bypassing the host's themed wrappers entirely. Lowercase
 * elements only flow through `props.components` when they were
 * created from markdown source by remark — which doesn't apply
 * here, because the surrounding JSX `<Table>` block makes the
 * content JSX, not markdown. Using the capitalised aliases (which
 * the host exposes alongside the lowercase keys — see
 * `getMarkdownComponents()` in
 * `packages/components/src/Markdown/index.tsx`) gets us the same
 * routing whether content arrives via markdown or via JSX.
 *
 * `<a>` specifically had a second symptom: bare `<a>` doesn't
 * route through the site's themed `Link` (which handles same-
 * origin route resolution and the `link({ variant: 'document' })`
 * styling), so links inside merged cells would render as
 * unstyled, full-page-navigating anchors. Emitting `<Link>`
 * matches the rest of the site.
 *
 * Why not emit markdown (`**bold**`)? MDX does not re-process
 * markdown formatting inside JSX element children, so `**bold**`
 * inside `<Td>` would render the literal asterisks.
 */
function $serializeInlineCellContent(parent: ElementNode): string {
  // Format bits we know how to round-trip. Order matters for the
  // open/close pairing below — bold wraps italic wraps code.
  const MARK_TAGS: Array<{ format: TextFormatType; tag: string }> = [
    { format: 'bold', tag: 'Strong' },
    { format: 'italic', tag: 'Em' },
    { format: 'code', tag: 'Code' }
  ];

  const renderTextNode = (node: LexicalNode): string => {
    if (!$isTextNode(node)) return '';
    const escaped = escapeJsxText(node.getTextContent());
    const open: string[] = [];
    const close: string[] = [];
    for (const { format, tag } of MARK_TAGS) {
      if (node.hasFormat(format)) {
        open.push(`<${tag}>`);
        close.unshift(`</${tag}>`);
      }
    }
    return open.join('') + escaped + close.join('');
  };

  const renderInline = (node: LexicalNode): string => {
    if ($isTextNode(node)) return renderTextNode(node);
    if ($isLinkNode(node)) {
      const url = node.getURL();
      const inner = node.getChildren().map(renderInline).join('');
      // Empty href is invalid in HTML; fall back to '#' rather
      // than emitting `href=""` which some renderers normalise to
      // the current page URL (silently changing meaning).
      const href = url && url.trim() ? url : '#';
      // `<Link>` here is the host's capitalised `Link` component
      // from `getMarkdownComponents()` — its prop is `href`, same
      // as a native anchor, so the attribute spelling is unchanged
      // from what we'd emit for `<a>`.
      return `<Link href="${escapeHtmlAttr(href)}">${inner}</Link>`;
    }
    if ($isElementNode(node)) {
      return node.getChildren().map(renderInline).join('');
    }
    // Unknown / decorator nodes: fall back to plain text so we
    // don't lose content, even if we can't represent the styling.
    return escapeJsxText(node.getTextContent());
  };

  return parent.getChildren().map(renderInline).join('');
}

/**
 * `$serializeCellChildren` — convert the full children list of a
 * `TableCellNode` (potentially multiple `ParagraphNode`s) into a
 * JSX/HTML fragment. Each paragraph is rendered as its inline
 * children joined together; consecutive paragraphs are separated
 * by a self-closing `<br />` because emitting an actual `<p>`
 * inside a `<Td>` would inherit paragraph margins and look wrong
 * inside the cell, and most cell content people merge is short
 * enough that a line break reads better than a full block break.
 */
function $serializeCellChildren(cell: TableCellNode): string {
  const parts: string[] = [];
  for (const child of cell.getChildren()) {
    if ($isParagraphNode(child) || $isElementNode(child)) {
      parts.push($serializeInlineCellContent(child));
    } else if ($isTextNode(child)) {
      parts.push(escapeJsxText(child.getTextContent()));
    }
  }
  // Drop empty leading/trailing paragraphs (`<p></p>` blocks the
  // editor sometimes generates from extra Enter presses) so the
  // serialised cell doesn't end up with spurious leading `<br />`s.
  while (parts.length > 0 && parts[0] === '') parts.shift();
  while (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  return parts.join('<br />');
}

/**
 * `$serializeTableAsHtml` — emit a `<Table>` JSX block (using the
 * capitalised host-component names: `Table`, `Thead`, `Tbody`,
 * `Tr`, `Th`, `Td`) with `colSpan` / `rowSpan` preserved. Subsumed
 * cells were removed from the row at merge time by `$mergeCells`,
 * so iterating `row.getChildren()` yields only the surviving cells.
 *
 * Why capitalised tags (and not lowercase HTML)?
 * MDX routes capitalised JSX identifiers (`<Table>`) through the
 * `components` prop passed to `<MDXClient />`; lowercase tags
 * (`<table>`) compile to bare DOM elements that bypass the
 * registry, losing all of the host's themed styling (border
 * tokens, spacing wrapper `<div className={tableContainer()}>`,
 * etc.). The host already exports both lowercase and capitalised
 * keys for these elements (see `getMarkdownElements()` in
 * `packages/components/src/Markdown/markdownElements.tsx`), so
 * the capitalised path renders identically to a GFM table.
 *
 * Cell content
 * ------------
 * Cells are serialised via `$serializeCellChildren`, which emits
 * inline marks (`<strong>` / `<em>` / `<code>`) and links (`<a>`)
 * as JSX/HTML element children. MDX parses element children as
 * JSX directly, so they reach the host's themed `strong` / `em` /
 * `code` / `a` wrappers and render with full styling. Multi-
 * paragraph cells are joined with `<br />`. Block-level content
 * inside cells (headings, lists, blockquotes) is not supported in
 * this path — those would require a much fuller HTML emitter and
 * are rare inside merged cells.
 */
function $serializeTableAsHtml(table: TableNode): string {
  const lines: string[] = ['<Table>'];

  // Split rows into a header section (contiguous rows of header
  // cells starting at the top) and body, so the emitted JSX has
  // a proper `<Thead>` / `<Tbody>` separation matching what our
  // themed renderer expects. This mirrors how the GFM exporter
  // treats the first row carrying the `ROW` header bit as the
  // divider boundary.
  //
  // Header state is a bitmask:
  //   ROW    = 1  → this cell is a row-header (top-of-table)
  //   COLUMN = 2  → this cell is a column-header (left-of-table)
  //   BOTH   = 3
  //   NO_STATUS = 0
  // `@lexical/table` defaults to marking the first column with
  // `COLUMN` for new tables, which is NOT what we want to treat
  // as a `<Thead>` row (otherwise every body row that has a
  // column-header in column 0 would look like a header row). We
  // therefore mask with `ROW` specifically.
  const rows = table.getChildren().filter($isTableRowNode);
  let headerEnd = 0;
  while (headerEnd < rows.length) {
    const row = rows[headerEnd];
    const allRowHeader =
      row.getChildrenSize() > 0 &&
      row
        .getChildren()
        .every(
          cell => $isTableCellNode(cell) && (cell.__headerState & TableCellHeaderStates.ROW) !== 0
        );
    if (!allRowHeader) break;
    headerEnd += 1;
  }

  const emitRow = (row: TableRowNode, tag: 'Th' | 'Td' | 'auto') => {
    lines.push('  <Tr>');
    for (const cell of row.getChildren()) {
      if (!$isTableCellNode(cell)) continue;
      const colSpan = cell.__colSpan ?? 1;
      const rowSpan = cell.__rowSpan ?? 1;
      const attrs: string[] = [];
      // JSX-style camelCase attributes with expression values so
      // React receives numbers (not strings) — matches how the
      // GFM `colspan`/`rowspan` HTML attributes would normalise
      // anyway and silences React's lowercase-DOM-attribute
      // warning in dev.
      if (colSpan > 1) attrs.push(`colSpan={${colSpan}}`);
      if (rowSpan > 1) attrs.push(`rowSpan={${rowSpan}}`);
      const attrStr = attrs.length ? ` ${attrs.join(' ')}` : '';
      // Per-cell tag: `auto` only promotes to `<Th>` when the
      // cell carries the `ROW` header bit (matching the GFM
      // exporter's divider logic). Column-only headers
      // (`COLUMN` bit set, `ROW` bit unset) stay as `<Td>` so a
      // table with the default first-column-is-column-header
      // marking doesn't render every body row's first cell as
      // a heading. Header rows force `<Th>` for every cell.
      const cellTag =
        tag === 'auto'
          ? (cell.__headerState & TableCellHeaderStates.ROW) !== 0
            ? 'Th'
            : 'Td'
          : tag;
      const inner = $serializeCellChildren(cell);
      lines.push(`    <${cellTag}${attrStr}>${inner}</${cellTag}>`);
    }
    lines.push('  </Tr>');
  };

  if (headerEnd > 0) {
    lines.push('  <Thead>');
    for (let i = 0; i < headerEnd; i += 1) emitRow(rows[i], 'Th');
    lines.push('  </Thead>');
  }
  if (headerEnd < rows.length) {
    lines.push('  <Tbody>');
    for (let i = headerEnd; i < rows.length; i += 1) emitRow(rows[i], 'auto');
    lines.push('  </Tbody>');
  }

  lines.push('</Table>');
  return lines.join('\n');
}

export const TABLE_RULE: ElementTransformer = {
  dependencies: [TableNode],
  export: (node: LexicalNode) => {
    if (!$isTableNode(node)) return null;

    // Merged cells can't be expressed in GFM table syntax, so
    // emit the whole table as inline HTML when any merge is
    // present. Non-merged tables still take the clean GFM path
    // so the saved markdown source stays human-readable.
    if ($tableHasMergedCells(node)) {
      return $serializeTableAsHtml(node);
    }

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
          // `__headerState` is a bitmask, not an enum value:
          //   ROW    = 1
          //   COLUMN = 2
          //   BOTH   = 3 (the default for the top-left cell of a
          //     freshly inserted table — `ROW | COLUMN`)
          // Match the ROW bit specifically so a top-left cell with
          // BOTH still triggers divider emission. A strict equality
          // check against `ROW` would miss that case and leave the
          // exported GFM table without its `| --- |` divider line,
          // which would in turn make the round-trip importer
          // forget the row was a header.
          if ((cell.__headerState & TableCellHeaderStates.ROW) !== 0) {
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

// --- HTML table import ------------------------------------------------

const HTML_TABLE_START_REGEX = /^\s*<[Tt]able(?:\s[^>]*)?>\s*$/;
const HTML_TABLE_END_REGEX = /^\s*<\/[Tt]able>\s*$/;
// Span attribute extractor — case-insensitive on the attribute
// NAME (so we accept both the JSX-canonical `colSpan` we now emit
// and the HTML-canonical `colspan` that hand-authored content or
// pasted HTML commonly uses), and tolerant of every value-quoting
// style: double quotes, single quotes, unquoted integers, or a
// JSX expression `{N}`. The capture groups extract the integer
// from whichever form matched.
const COLSPAN_ATTR_REGEX = /\bcol[Ss]pan\s*=\s*(?:"(\d+)"|'(\d+)'|\{(\d+)}|(\d+))/;
const ROWSPAN_ATTR_REGEX = /\brow[Ss]pan\s*=\s*(?:"(\d+)"|'(\d+)'|\{(\d+)}|(\d+))/;

function readSpan(tagOpen: string, regex: RegExp): number {
  const m = tagOpen.match(regex);
  if (!m) return 1;
  const value = parseInt(m[1] || m[2] || m[3] || m[4] || '1', 10);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/**
 * Reverse `escapeJsxText`'s `{'<'}` / `{'>'}` / `{'{'}` / `{'}'}`
 * substitutions on import. Does NOT decode HTML entities here —
 * those are handled per-text-node in `$populateCellFromHtml` so
 * that entities inside `<a href="...">` attribute values
 * (`&amp;`, `&quot;`) are decoded at the right level.
 */
function decodeJsxEscapes(text: string): string {
  return text
    .replace(/\{'<'}/g, '<')
    .replace(/\{'>'}/g, '>')
    .replace(/\{'\{'}/g, '{')
    .replace(/\{'}'}/g, '}');
}

/**
 * Decode the small set of HTML entities we'd accept from hand-
 * authored content. Used on cell text-runs (not on whole-cell HTML),
 * so the `<` in an entity-encoded `&lt;` becomes a literal text
 * `<` after the inline-HTML tokenizer has already split structural
 * tags from text.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

interface ParsedCell {
  tag: 'td' | 'th';
  colSpan: number;
  rowSpan: number;
  content: string;
}

/**
 * `parseHtmlTableBody` — pull `<tr>` blocks out of the inner HTML
 * of a `<table>` (the `<thead>`/`<tbody>` wrappers are flattened
 * since the row's own header state is reconstructed from each
 * `<th>` cell anyway). Within each row we extract `<th>`/`<td>`
 * cells with their span attributes and inner content. The parser
 * is deliberately regex-based rather than a full DOM tree because:
 *   - we never see nested tables in this layer (the GFM path
 *     wouldn't produce them and the editor doesn't author them);
 *   - cell content is downstream-parsed by the markdown
 *     transformer set, so we don't need to understand the inner
 *     HTML further than "everything between the matching
 *     `</t[hd]>`".
 */
function parseHtmlTableBody(inner: string): ParsedCell[][] {
  // Use the global `s` flag so `.` matches newlines — cell content
  // commonly contains them after our exporter (and authored
  // markdown often does too). Tag names are matched in a small
  // character class (`[Tt]r`, `[Tt][HhDd]`) rather than with the
  // `i` flag so we only accept the two canonical casings the
  // exporter and hand-authored HTML use; arbitrary mixed-case
  // tags (`<TR>`, `<tD>`) would be ambiguous and we'd rather
  // skip than guess.
  const rowRegex = /<[Tt]r\b[^>]*>([\s\S]*?)<\/[Tt]r\s*>/g;
  const cellRegex = /<([Tt][HhDd])\b([^>]*)>([\s\S]*?)<\/\1\s*>/g;

  const rows: ParsedCell[][] = [];
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowRegex.exec(inner)) !== null) {
    const rowInner = rowMatch[1];
    const cells: ParsedCell[] = [];
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellRegex.exec(rowInner)) !== null) {
      const [, tag, attrs, content] = cellMatch;
      cells.push({
        // Normalise to lowercase for the consumer's `tag === 'th'`
        // gate — the actual JSX/HTML emission downstream picks
        // its own casing anyway.
        tag: tag.toLowerCase() as 'td' | 'th',
        colSpan: readSpan(attrs, COLSPAN_ATTR_REGEX),
        rowSpan: readSpan(attrs, ROWSPAN_ATTR_REGEX),
        // Reverse only the JSX-expression escapes here; HTML
        // entities are decoded later, per text-run, by the
        // inline-HTML tokenizer in `$populateCellFromHtml`.
        content: decodeJsxEscapes(content.trim())
      });
    }
    if (cells.length > 0) rows.push(cells);
  }
  return rows;
}

/**
 * `$populateCellFromHtml` — parse the small subset of inline HTML
 * we emit (and tolerate from hand-authored content) directly into
 * Lexical nodes inside `cell`. Counterpart to `$serializeCellChildren`
 * on the export side; together they form the round-trip:
 *
 *   `<strong>` / `<b>`     → TextNode + bold format bit
 *   `<em>`     / `<i>`     → TextNode + italic format bit
 *   `<code>`               → TextNode + code format bit
 *   `<a href="...">...</a>`→ LinkNode with inner text
 *   `<br />` / `<br>`      → paragraph break (new ParagraphNode)
 *   Plain text             → TextNode with current format bits
 *
 * Why hand-roll a tokenizer instead of feeding the string to
 * `$convertFromMarkdownString`? The markdown transformers operate
 * on markdown syntax (`**bold**`, `[text](url)`), but our HTML
 * path emits and accepts JSX/HTML element syntax (`<strong>...</strong>`),
 * which the markdown transformers treat as literal text. The
 * tokenizer is intentionally tiny — it understands only the
 * elements we ourselves emit plus the two synonymous tags
 * (`<b>`, `<i>`) that pasted content commonly uses — and falls
 * back to "emit as text" for anything else, so unrecognised HTML
 * survives as visible content rather than being silently dropped.
 *
 * Unknown attributes on supported elements are ignored (we only
 * read `href` from `<a>`). Nested marks compose via the format-bit
 * stack: `<strong><em>x</em></strong>` produces a single TextNode
 * with both bold and italic bits set, which is how the editor's
 * own model represents them.
 */
function $populateCellFromHtml(cell: TableCellNode, html: string): void {
  // Each `<br />` starts a fresh paragraph. We always open with
  // one so the cell never ends up empty (the editor's table
  // observer expects at least one block child per cell).
  let currentParagraph = $createParagraphNode();
  cell.append(currentParagraph);

  // Format-bit stack. Each entry is a `TextFormatType` we should
  // OR into every TextNode appended while it's on the stack.
  // Pushed by `<strong>` / `<em>` / `<code>` (and the `<b>` /
  // `<i>` synonyms), popped by their matching close tags.
  const formatStack: TextFormatType[] = [];
  // Link nesting stack. Lexical's LinkNode cannot itself contain
  // a LinkNode, but we still use a stack to keep the bookkeeping
  // symmetric with the format stack and to tolerate broken input.
  // While non-empty, new TextNodes are appended into the top of
  // the stack rather than the current paragraph.
  const linkStack: ReturnType<typeof $createLinkNode>[] = [];

  const appendText = (text: string) => {
    if (text === '') return;
    const node = $createTextNode(decodeHtmlEntities(text));
    for (const fmt of formatStack) node.toggleFormat(fmt);
    if (linkStack.length > 0) {
      linkStack[linkStack.length - 1].append(node);
    } else {
      currentParagraph.append(node);
    }
  };

  // Single regex stepped through the string. The token kinds:
  //   1. self-closing tag       `<br />` / `<br>` / `<X />`
  //   2. open tag with attrs    `<a href="...">`
  //   3. close tag              `</a>`
  // Anything between matches is text. The `s` flag is not needed
  // because we operate on a single cell's content (already a
  // string with whatever newlines the exporter put in — those
  // become whitespace inside TextNodes, which Lexical collapses
  // on render).
  const tokenRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)\s*(\/)?>/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(html)) !== null) {
    const [full, rawTagName, attrs, selfClose] = match;
    const before = html.slice(lastIndex, match.index);
    if (before) appendText(before);

    const tagName = rawTagName.toLowerCase();
    const isClose = full.startsWith('</');
    const isSelfClose = Boolean(selfClose) || tagName === 'br';

    if (tagName === 'br') {
      // Paragraph break — close the current paragraph and start a
      // fresh one. Mark/link state intentionally does NOT carry
      // across paragraphs; pasted content with a `<br />` inside
      // a `<strong>` would be malformed anyway.
      currentParagraph = $createParagraphNode();
      cell.append(currentParagraph);
    } else if (!isClose) {
      // Opening tag.
      // Both lowercase and capitalised tag names are accepted: the
      // exporter emits the capitalised JSX aliases (`<Strong>`,
      // `<Em>`, `<Code>`, `<Link>`) so they route through the
      // host's `props.components` map, but pasted/hand-authored
      // HTML commonly uses the lowercase variants. Tag-name
      // lowercasing above means the same comparison covers both.
      // `'link'` is the lowercased form of `<Link>`; the older
      // anchor spelling `<a>` is also still accepted.
      if (tagName === 'strong' || tagName === 'b') formatStack.push('bold');
      else if (tagName === 'em' || tagName === 'i') formatStack.push('italic');
      else if (tagName === 'code') formatStack.push('code');
      else if (tagName === 'a' || tagName === 'link') {
        const hrefMatch = attrs.match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/);
        const href = hrefMatch
          ? decodeHtmlEntities(hrefMatch[1] || hrefMatch[2] || hrefMatch[3] || '')
          : '';
        const link = $createLinkNode(href);
        if (linkStack.length > 0) {
          // Nested link — shouldn't happen from our exporter but
          // tolerate it by attaching to the outer link's owner so
          // the inner link's text isn't lost.
          linkStack[linkStack.length - 1].append(link);
        } else {
          currentParagraph.append(link);
        }
        linkStack.push(link);
      } else {
        // Unknown tag — emit it as text so authors notice and can
        // fix the source rather than having content vanish.
        appendText(full);
      }
      // Self-closing variants of marks/links don't really make
      // sense; just immediately balance the stack so we don't
      // leak state.
      if (isSelfClose) {
        if (tagName === 'strong' || tagName === 'b') formatStack.pop();
        else if (tagName === 'em' || tagName === 'i') formatStack.pop();
        else if (tagName === 'code') formatStack.pop();
        else if (tagName === 'a' || tagName === 'link') linkStack.pop();
      }
    } else {
      // Closing tag.
      if (
        tagName === 'strong' ||
        tagName === 'b' ||
        tagName === 'em' ||
        tagName === 'i' ||
        tagName === 'code'
      ) {
        // Pop the matching format. We don't enforce strict matching
        // (a stray `</em>` inside `<strong>` would still pop the
        // top of the stack), trading correctness for tolerance —
        // garbage HTML can't crash the parser.
        formatStack.pop();
      } else if (tagName === 'a' || tagName === 'link') {
        linkStack.pop();
      }
      // Unknown close tags are silently dropped (the matching
      // open tag was already emitted as text via the unknown-tag
      // fallback above).
    }

    lastIndex = match.index + full.length;
  }

  // Trailing text after the last tag (or the whole string if
  // there were no tags at all).
  const trailing = html.slice(lastIndex);
  if (trailing) appendText(trailing);

  // Ensure the cell ends with a non-empty paragraph; if `<br />`
  // ended the input, we'd have an empty trailing paragraph that
  // takes up vertical space for no reason.
  const last = cell.getLastChild();
  if (
    last &&
    $isParagraphNode(last) &&
    last.getChildrenSize() === 0 &&
    cell.getChildrenSize() > 1
  ) {
    last.remove();
  }
  // Conversely, if the cell ended up with nothing at all (e.g.
  // input was the empty string), give it the empty paragraph the
  // editor's table model expects.
  if (cell.getChildrenSize() === 0) {
    cell.append($createParagraphNode());
  }
}

/**
 * `HTML_TABLE_RULE` — counterpart to {@link TABLE_RULE} that
 * recognises inline `<table>...</table>` blocks (emitted by the
 * GFM exporter when a table contains merged cells) and rebuilds
 * them into a {@link TableNode} with `colSpan` / `rowSpan` set.
 *
 * Without this rule, a saved doc containing a merged table would
 * round-trip as raw `<table>` text the next time the editor opens
 * it — visible to the user but uneditable as a table. With it,
 * the merge survives the full edit→save→reload loop.
 *
 * Cell content is parsed by {@link $populateCellFromHtml}, which
 * understands the inline-mark / link / line-break subset our
 * exporter emits (`<strong>`, `<em>`, `<code>`, `<a>`, `<br />`)
 * and the synonymous tags (`<b>`, `<i>`) commonly found in
 * pasted content. Marks compose via a format-bit stack, so nested
 * `<strong><em>...</em></strong>` round-trips to a single
 * TextNode with both bold and italic set — matching how the
 * editor's own model represents combined marks.
 *
 * Block-level content inside cells (headings, lists, blockquotes,
 * nested tables) is not supported in this path. Unrecognised
 * tags fall through as visible text so authors can spot and fix
 * them rather than silently losing content.
 */
export const HTML_TABLE_RULE: MultilineElementTransformer = {
  dependencies: [TableNode],
  regExpStart: HTML_TABLE_START_REGEX,
  regExpEnd: HTML_TABLE_END_REGEX,
  replace: (rootNode, _children, _startMatch, _endMatch, linesInBetween, isImport) => {
    // The transformer only handles imports; markdown-shortcut
    // typing (`isImport === false`) doesn't fire for multi-line
    // HTML blocks, but be explicit anyway so future maintenance
    // doesn't inadvertently enable a half-supported path.
    if (!isImport || linesInBetween == null) return false;

    const parsedRows = parseHtmlTableBody(linesInBetween.join('\n'));
    if (parsedRows.length === 0) return false;

    // Compute total columns including the effect of colspans so
    // we can pad short rows. Don't try to be clever about
    // rowspans — the editor's table model tracks them per-cell
    // and renders correctly without explicit placeholder cells.
    const totalColumns = parsedRows.reduce(
      (max, row) =>
        Math.max(
          max,
          row.reduce((sum, c) => sum + c.colSpan, 0)
        ),
      0
    );

    const tableNode = $createTableNode();
    for (const cells of parsedRows) {
      const tableRow = $createTableRowNode();
      tableNode.append(tableRow);

      let occupiedCols = 0;
      for (const parsed of cells) {
        const headerState =
          parsed.tag === 'th' ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS;
        const cellNode = $createTableCellNode(headerState);
        if (parsed.colSpan > 1) cellNode.setColSpan(parsed.colSpan);
        if (parsed.rowSpan > 1) cellNode.setRowSpan(parsed.rowSpan);
        // Inline-HTML parse: handles the `<strong>` / `<em>` /
        // `<code>` / `<a>` / `<br />` subset our exporter emits
        // (plus the `<b>` / `<i>` synonyms commonly found in
        // pasted content). For anything outside that subset the
        // tokenizer falls back to emitting the raw tag as text,
        // so unrecognised HTML stays visible rather than being
        // silently dropped.
        $populateCellFromHtml(cellNode, parsed.content);
        tableRow.append(cellNode);
        occupiedCols += parsed.colSpan;
      }
      // Pad short rows with empty cells so the editor's grid
      // model stays consistent. Rows that were short because of
      // an upstream `rowspan` "consuming" their slot will get
      // extra padding cells — that's still valid markup and the
      // table renders correctly, it just means the source HTML
      // was authoring rowspans that don't quite tile; we accept
      // that over the alternative of building a full skip-map.
      for (let i = occupiedCols; i < totalColumns; i += 1) {
        tableRow.append($createTableCellNode(TableCellHeaderStates.NO_STATUS));
      }
    }

    rootNode.append(tableNode);
    return;
  },
  type: 'multiline-element'
};
