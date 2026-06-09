'use client';

/**
 * Unified line-level diff renderer for the save dialog.
 *
 * Takes the pristine on-disk markdown and the current editor markdown
 * and renders a pre-formatted unified diff: green `+` lines for
 * additions, red `-` lines for removals, muted ` ` lines for the
 * surrounding context.
 *
 * Implementation notes:
 *
 * - Uses `diffLines` (jsdiff) rather than `diffWordsWithSpace` because
 *   line granularity is what reviewers actually want to scan before
 *   raising a PR — matches the GitHub PR diff convention. Word-level
 *   highlighting *within* a changed line is a sensible follow-up but
 *   adds rendering complexity (intra-line spans inside the line div)
 *   for marginal gain at the typical change size we expect from a
 *   docs author (a paragraph, a list item, a frontmatter tweak).
 * - Renders to a `<pre>` so whitespace, indentation and runs of `>`
 *   for blockquotes are preserved verbatim. The diff is read-only so
 *   we don't need a virtualised list — but we DO cap at
 *   `MAX_LINES_DEFAULT` to defend against catastrophic diffs (entire
 *   file rewrites) blowing up the dialog. A "show all (+N more)"
 *   button reveals the rest if the user really wants to scroll.
 * - The context window around changes (`CONTEXT_LINES`) is set to 3,
 *   the same default `git diff` uses. Trimming pure-context blocks
 *   keeps the rendered diff focused on what changed; we mark elided
 *   regions with a `…` separator so it's obvious the diff isn't
 *   missing anything.
 *
 * This component is intentionally framework-thin: no Salt primitives,
 * no theme-token CSS, just the vanilla-extract styles co-located in
 * `Diff.css.ts`. The save dialog is the only consumer.
 */

import { useMemo, useState } from 'react';
import { diffLines, type Change } from 'diff';

import style from './Diff.css';

/** Lines of unchanged context to keep around each change, like `git diff -U3`. */
const CONTEXT_LINES = 3;

/** Hard cap before the user has to opt in to seeing the rest. */
const MAX_LINES_DEFAULT = 200;

interface DiffLine {
  kind: 'add' | 'remove' | 'context' | 'elision';
  /** Display text. For elision rows this is the `…` separator. */
  text: string;
}

/**
 * Convert jsdiff's per-change-block array into a flat per-line array,
 * collapsing long runs of context to keep the diff scannable.
 *
 * `diffLines` already terminates each line with `\n`; we split on
 * newline and drop the trailing empty element so each resulting entry
 * is a single visible line.
 */
function buildDiffLines(changes: Change[]): DiffLine[] {
  // First pass: explode each change into per-line entries tagged
  // with the kind. Context blocks stay intact here; the second
  // pass trims them once we know which sides are surrounded by
  // changes.
  type RawBlock = {
    kind: 'add' | 'remove' | 'context';
    lines: string[];
  };
  const blocks: RawBlock[] = changes.map(c => {
    const kind: RawBlock['kind'] = c.added ? 'add' : c.removed ? 'remove' : 'context';
    // Strip the single trailing newline jsdiff appends so we don't
    // emit a blank tail line per block.
    const raw = c.value.endsWith('\n') ? c.value.slice(0, -1) : c.value;
    return { kind, lines: raw.length === 0 ? [] : raw.split('\n') };
  });

  // Second pass: trim long context blocks to CONTEXT_LINES at each
  // boundary. The first block keeps only its tail context; the last
  // block keeps only its head; interior context blocks longer than
  // 2 * CONTEXT_LINES collapse their middle into an elision row.
  const out: DiffLine[] = [];
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.kind !== 'context') {
      for (const text of block.lines) {
        out.push({ kind: block.kind, text });
      }
      continue;
    }
    const isFirst = i === 0;
    const isLast = i === blocks.length - 1;
    if (isFirst && isLast) {
      // Pure-context (no changes at all). Emit nothing — the empty
      // result is what the parent renders as "No changes".
      continue;
    }
    const lines = block.lines;
    if (isFirst) {
      // Only need a tail of context leading into the first change.
      const tail = lines.slice(-CONTEXT_LINES);
      if (lines.length > tail.length) out.push({ kind: 'elision', text: '…' });
      for (const text of tail) out.push({ kind: 'context', text });
    } else if (isLast) {
      // Only need a head of context after the last change.
      const head = lines.slice(0, CONTEXT_LINES);
      for (const text of head) out.push({ kind: 'context', text });
      if (lines.length > head.length) out.push({ kind: 'elision', text: '…' });
    } else if (lines.length <= CONTEXT_LINES * 2) {
      // Interior block short enough to keep verbatim.
      for (const text of lines) out.push({ kind: 'context', text });
    } else {
      // Interior block: keep the head and tail, elide the middle.
      const head = lines.slice(0, CONTEXT_LINES);
      const tail = lines.slice(-CONTEXT_LINES);
      for (const text of head) out.push({ kind: 'context', text });
      out.push({ kind: 'elision', text: '…' });
      for (const text of tail) out.push({ kind: 'context', text });
    }
  }
  return out;
}

export interface DiffStats {
  /** Number of lines added. */
  added: number;
  /** Number of lines removed. */
  removed: number;
  /** True when no add/remove blocks were produced. */
  unchanged: boolean;
}

/**
 * Hook returning both the rendered lines and a small stats object so
 * the dialog can show "Review changes (+3 −1)" in the accordion
 * header without running the diff twice.
 */
export function useDiff(
  original: string,
  updated: string
): { lines: DiffLine[]; stats: DiffStats } {
  return useMemo(() => {
    // jsdiff is a pure function of its inputs — memo by identity of
    // the two strings. The dialog passes stable snapshots captured on
    // open, so this hook runs once per open + once per "Review
    // changes" toggle re-mount.
    const changes = diffLines(original, updated);
    const lines = buildDiffLines(changes);
    let added = 0;
    let removed = 0;
    for (const c of changes) {
      if (!c.added && !c.removed) continue;
      // jsdiff sets `count` on each block; fall back to splitting if
      // it's missing (older jsdiff versions or odd inputs).
      const n =
        c.count ??
        (c.value.endsWith('\n') ? c.value.split('\n').length - 1 : c.value.split('\n').length);
      if (c.added) added += n;
      else removed += n;
    }
    return { lines, stats: { added, removed, unchanged: added === 0 && removed === 0 } };
  }, [original, updated]);
}

export interface DiffProps {
  lines: DiffLine[];
  /** Override the default truncation cap. Tests use this to keep fixtures small. */
  maxLines?: number;
}

const PREFIX: Record<DiffLine['kind'], string> = {
  add: '+ ',
  remove: '- ',
  context: '  ',
  elision: '  '
};

const LINE_CLASS: Record<DiffLine['kind'], string> = {
  add: style.add,
  remove: style.remove,
  context: style.context,
  elision: style.elision
};

export const Diff = ({ lines, maxLines = MAX_LINES_DEFAULT }: DiffProps) => {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll || lines.length <= maxLines ? lines : lines.slice(0, maxLines);
  const hidden = lines.length - visible.length;
  return (
    <div className={style.root}>
      <pre className={style.pre} aria-label="Unified diff of pending changes">
        {visible.map((line, i) => (
          // Line index is stable here: `lines` is computed from a
          // pair of strings captured at dialog-open time and doesn't
          // mutate on subsequent renders. eslint's array-key rule is
          // a heuristic; in this exact case the index IS the identity.

          <div key={i} className={LINE_CLASS[line.kind]}>
            <span className={style.gutter} aria-hidden="true">
              {PREFIX[line.kind]}
            </span>
            {line.text || '\u00a0'}
          </div>
        ))}
      </pre>
      {hidden > 0 && (
        <button type="button" className={style.showAll} onClick={() => setShowAll(true)}>
          Show {hidden} more line{hidden === 1 ? '' : 's'}
        </button>
      )}
    </div>
  );
};
