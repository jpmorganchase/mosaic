/**
 * Puts back the blank lines the editor dropped from a page.
 *
 * The editor writes a blank line between blocks wherever the author left
 * one, but two kinds of blank line aren't in its document, so it drops
 * them:
 *
 * - those in a list, such as between its items. A list written with a blank
 *   line between its items (a "loose" list, which renders with more space
 *   between items) comes back tight, and neither Lexical nor Prettier can
 *   restore it, so every save would rewrite every loose list on the page;
 * - those after the frontmatter, which the serialiser doesn't write.
 *
 * This puts back those, and only those. It compares the page's non-blank
 * lines before and after the save: a line is the same line if it is
 * unchanged, or edited in place (a run of lines replaced by as many lines).
 * Where the saved page has no blank line between two lines of a list:
 *
 * - if they are the same lines and were next to each other in the original,
 *   the blank lines the original had between them are put back;
 * - otherwise, if they end one item and start the next item of its list,
 *   and that list was loose in the original, a blank line is added, so
 *   adding or removing an item keeps a loose list loose.
 *
 * Everywhere else the saved page's spacing is kept: the author can add and
 * remove blank lines between other blocks (splitting a paragraph, or
 * joining two with a line break), and blank lines in the frontmatter and in
 * fenced code blocks are part of their content. Only empty lines are ever
 * added, so nothing the author wrote is changed.
 */
import { diffArrays } from 'diff';

const isBlank = (line: string) => line.trim() === '';
const indentOf = (line: string) => line.length - line.trimStart().length;

/**
 * The list a list item line is in, as its indentation and marker (the
 * bullet, or an ordered list's delimiter): items with the same indentation
 * and marker are in the same list. `undefined` for other lines.
 */
function listOf(line: string): string | undefined {
  const match = /^(\s*)([-*+]|\d{1,9}[.)])(?:\s|$)/.exec(line);
  return match ? `${match[1].length}${match[2].slice(-1)}` : undefined;
}

/**
 * The index of the line closing the page's frontmatter, found as
 * `@jpmorganchase/mosaic-serialisers` finds it, or -1 without frontmatter.
 * Frontmatter that isn't closed runs to the end of the page.
 */
function frontmatterEnd(lines: string[]): number {
  const first = lines[0].replace(/^\uFEFF/, '');
  if (!first.startsWith('---') || first.startsWith('----')) return -1;
  const end = lines.findIndex((line, index) => index > 0 && line.startsWith('---'));
  return end === -1 ? lines.length - 1 : end;
}

/**
 * For each line, the index of the first line of the block it is part of,
 * for the blocks whose blank lines are content: the frontmatter, and fenced
 * code blocks (fences included). -1 for lines in no such block.
 */
function verbatimBlocks(lines: string[], frontmatter: number): number[] {
  const blocks = lines.map(() => -1);
  blocks.fill(0, 0, frontmatter + 1);
  let opening: { index: number; fence: string } | undefined;
  for (let index = frontmatter + 1; index < lines.length; index++) {
    const line = lines[index];
    const fence = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (opening) {
      blocks[index] = opening.index;
      // A closing fence is only the opening fence's character, at least as many times.
      if (
        fence !== undefined &&
        fence[0] === opening.fence[0] &&
        fence.length >= opening.fence.length &&
        line.trim() === fence
      ) {
        opening = undefined;
      }
    } else if (fence !== undefined) {
      opening = { index, fence };
      blocks[index] = index;
    }
  }
  return blocks;
}

/** A page's lines, and what is known about them. */
function readPage(text: string) {
  const lines = text.split('\n');
  /** The indexes of the non-blank lines. */
  const nonBlank = lines.flatMap((line, index) => (isBlank(line) ? [] : [index]));
  const at = (index: number) => lines[nonBlank[index]];
  /**
   * Whether each non-blank line is in a list: an item, or a line indented
   * under one, such as the rest of an item or a nested list.
   */
  const inList: boolean[] = [];
  /** For each non-blank line that is a list item, the previous item of its list. */
  const previousItem: (number | undefined)[] = [];
  const frontmatter = frontmatterEnd(lines);
  const verbatim = verbatimBlocks(lines, frontmatter);
  const listIndents: number[] = [];
  const matchKeys: string[] = [];
  nonBlank.forEach((_, index) => {
    const line = at(index);
    const list = listOf(line);
    inList.push(list !== undefined || (index > 0 && inList[index - 1] && indentOf(line) > 0));
    if (!inList[index]) listIndents.length = 0;
    if (list !== undefined && verbatim[nonBlank[index]] === -1) {
      const indent = indentOf(line);
      while (listIndents.length && listIndents.at(-1)! > indent) listIndents.pop();
      if (listIndents.at(-1) !== indent) listIndents.push(indent);
      // Match list depth across indentation styles while keeping identical
      // entries at different depths distinct.
      const item = line.trim().replace(/^\d{1,9}([.)])(?=\s|$)/, '#$1');
      matchKeys.push(`list:${listIndents.length}:${item}`);
    } else {
      matchKeys.push(`line:${line.trimEnd()}`);
    }
    let previous: number | undefined;
    // Lines indented further than the item are part of the items before it;
    // any other line ends its list.
    for (let i = index - 1; list !== undefined && i >= 0 && inList[i]; i--) {
      if (listOf(at(i)) === list) previous = i;
      if (previous !== undefined || indentOf(at(i)) <= indentOf(line)) break;
    }
    previousItem.push(previous);
  });
  return {
    lines,
    nonBlank,
    at,
    inList,
    previousItem,
    frontmatter,
    verbatim,
    matchKeys
  };
}
type Page = ReturnType<typeof readPage>;

/** Whether the lines between lines `from` and `to` are in a block whose blank lines are content. */
const inVerbatim = (page: Page, from: number, to: number) =>
  page.verbatim[from] !== -1 && page.verbatim[from] === page.verbatim[to];

/**
 * Which of the original's non-blank lines each of the saved page's
 * non-blank lines is, for lines that are unchanged or edited in place.
 * Trailing whitespace, list indentation style and ordered list numbers
 * can change during a save without changing the line's identity.
 */
function matchLines(before: Page, after: Page): Map<number, number> {
  const changes = diffArrays(before.matchKeys, after.matchKeys);
  const originalOf = new Map<number, number>();
  let beforeIndex = 0;
  let afterIndex = 0;
  const countOf = (change: typeof changes[number]) => change.count ?? change.value.length;
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const count = countOf(change);
    const next = changes[i + 1];
    // Lines replaced by as many lines were edited in place.
    const editedInPlace =
      next !== undefined &&
      ((change.removed && next.added) || (change.added && next.removed)) &&
      countOf(next) === count;
    if (editedInPlace || (!change.added && !change.removed)) {
      for (let offset = 0; offset < count; offset++) {
        originalOf.set(afterIndex + offset, beforeIndex + offset);
      }
      beforeIndex += count;
      afterIndex += count;
      if (editedInPlace) i++;
    } else if (change.added) {
      afterIndex += count;
    } else {
      beforeIndex += count;
    }
  }
  return originalOf;
}

export function keepOriginalBlankLines(original: string, saved: string): string {
  const before = readPage(original);
  const after = readPage(saved);
  if (after.nonBlank.length === 0) return saved;
  const originalOf = matchLines(before, after);

  /** The blank lines in the original after its `index`th non-blank line, outside the frontmatter and code. */
  const blankLinesAfter = (index: number) => {
    const line = before.nonBlank[index];
    const next = before.nonBlank[index + 1];
    return next === undefined || inVerbatim(before, line, next) ? 0 : next - line - 1;
  };
  const blankLinesAfterFrontmatter = (() => {
    const end = before.frontmatter;
    const next = before.lines.findIndex((line, index) => index > end && !isBlank(line));
    return end === -1 || next === -1 ? 0 : next - end - 1;
  })();
  // The original's lists, each as its first item, and those that are loose:
  // with a blank line before one of their items other than the first.
  const listStart = new Map<number, number>();
  const looseLists = new Set<number>();
  before.previousItem.forEach((previous, index) => {
    if (listOf(before.at(index)) === undefined) return;
    const start = previous === undefined ? index : listStart.get(previous) ?? previous;
    listStart.set(index, start);
    if (previous !== undefined && blankLinesAfter(index - 1) > 0) looseLists.add(start);
  });
  const isLooseItem = (index: number) => looseLists.has(listStart.get(index) ?? -1);

  /**
   * The blank lines to add between the saved page's `index`th non-blank
   * line and the next, which it wrote with no blank line between them.
   */
  const blankLinesToAdd = (index: number) => {
    if (after.nonBlank[index] === after.frontmatter) return blankLinesAfterFrontmatter;
    if (!after.inList[index] || !after.inList[index + 1]) return 0;
    const from = originalOf.get(index);
    const to = originalOf.get(index + 1);
    if (from !== undefined && to === from + 1) return blankLinesAfter(from);
    // The end of one item and the start of the next item of its list.
    const previous = after.previousItem[index + 1];
    if (previous === undefined) return 0;
    const inLooseList = [originalOf.get(previous), to].some(
      line => line !== undefined && isLooseItem(line)
    );
    return inLooseList ? 1 : 0;
  };

  const { lines, nonBlank } = after;
  const result = lines.slice(0, nonBlank[0]);
  nonBlank.forEach((line, index) => {
    result.push(lines[line]);
    const next = nonBlank[index + 1];
    if (next === undefined) {
      result.push(...lines.slice(line + 1));
    } else if (next > line + 1 || inVerbatim(after, line, next)) {
      // The saved page's blank lines, and code, are kept as they are.
      result.push(...lines.slice(line + 1, next));
    } else {
      result.push(...Array<string>(blankLinesToAdd(index)).fill(''));
    }
  });
  return result.join('\n');
}
