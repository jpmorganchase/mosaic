/**
 * Keeps the original blank lines between lines a save didn't change.
 *
 * The editor writes lists tight: a list written with a blank line between
 * its items (a "loose" list, which renders with more space between items)
 * comes back without them, and neither Lexical nor Prettier can restore
 * them, because the editor's document doesn't record them. So every save
 * would rewrite every loose list on the page.
 *
 * This compares the page's non-blank lines before and after the save. A
 * line is the same line if it is unchanged, or edited in place (a run of
 * lines replaced by as many lines). Where two such lines were next to each
 * other in the original, the blank lines the original had between them are
 * kept. Everywhere else, such as around added or removed lines, the saved
 * page's spacing is used. Only blank lines are ever taken from the
 * original, so nothing the author wrote is changed.
 */
import { diffArrays } from 'diff';

const isBlank = (line: string) => line.trim() === '';

/** The indexes of the non-blank lines in `lines`. */
const nonBlank = (lines: string[]) =>
  lines.flatMap((line, index) => (isBlank(line) ? [] : [index]));

export function keepOriginalBlankLines(original: string, saved: string): string {
  const before = original.split('\n');
  const after = saved.split('\n');
  const beforeLines = nonBlank(before);
  const afterLines = nonBlank(after);
  if (afterLines.length === 0) return saved;

  // Which original non-blank line each saved line is, for lines that are
  // unchanged or edited in place. Trailing whitespace (including a `\r`)
  // doesn't make a line different.
  const key = (lines: string[]) => (index: number) => lines[index].trimEnd();
  const changes = diffArrays(beforeLines.map(key(before)), afterLines.map(key(after)));
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

  const result = after.slice(0, afterLines[0]);
  afterLines.forEach((line, index) => {
    result.push(after[line]);
    const next = afterLines[index + 1];
    if (next === undefined) {
      result.push(...after.slice(line + 1));
      return;
    }
    const from = originalOf.get(index);
    const to = originalOf.get(index + 1);
    result.push(
      ...(from !== undefined && to === from + 1
        ? before.slice(beforeLines[from] + 1, beforeLines[to])
        : after.slice(line + 1, next))
    );
  });
  return result.join('\n');
}
