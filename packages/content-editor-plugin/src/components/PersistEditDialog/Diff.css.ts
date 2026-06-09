import { style } from '@vanilla-extract/css';

/**
 * Diff renderer styling.
 *
 * Colours are picked to read on both light and dark Salt themes
 * without pulling in theme-mode-aware tokens here. The add/remove
 * tints use translucent backgrounds so they sit on whatever the
 * dialog content area looks like; the foreground colours are
 * sufficiently saturated to keep contrast on the tint.
 *
 * The container has `max-height` rather than `height` so the diff
 * can be shorter than the cap and not pad to it; the inner `<pre>`
 * scrolls when content overflows. Horizontal overflow scrolls too —
 * markdown lines (especially tables and code fences) can exceed the
 * dialog width, and we'd rather offer a scrollbar than wrap mid-line
 * and confuse the reader.
 */
const root = style({
  marginTop: 8,
  marginBottom: 4
});

const pre = style({
  margin: 0,
  padding: 8,
  maxHeight: 320,
  overflow: 'auto',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.8125rem',
  lineHeight: 1.45,
  border: '1px solid rgba(127, 127, 127, 0.3)',
  borderRadius: 4,
  // Whitespace must be preserved for indentation, but long lines
  // should be allowed to scroll horizontally rather than wrap.
  whiteSpace: 'pre',
  wordBreak: 'normal'
});

const lineBase = {
  display: 'flex',
  alignItems: 'baseline',
  gap: 4,
  paddingLeft: 4,
  paddingRight: 4
};

const add = style([
  lineBase,
  {
    backgroundColor: 'rgba(46, 160, 67, 0.18)',
    color: 'rgb(46, 160, 67)'
  }
]);

const remove = style([
  lineBase,
  {
    backgroundColor: 'rgba(248, 81, 73, 0.18)',
    color: 'rgb(248, 81, 73)'
  }
]);

const context = style([
  lineBase,
  {
    opacity: 0.7
  }
]);

const elision = style([
  lineBase,
  {
    opacity: 0.5,
    fontStyle: 'italic'
  }
]);

const gutter = style({
  // The `+ `, `- ` etc. prefix is decorative — keep it monospaced
  // and aligned but de-emphasised so the line text dominates.
  flex: '0 0 auto',
  opacity: 0.6,
  userSelect: 'none'
});

const showAll = style({
  marginTop: 6,
  background: 'none',
  border: 'none',
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  cursor: 'pointer',
  textDecoration: 'underline',
  opacity: 0.85,
  ':hover': {
    opacity: 1
  }
});

export default {
  root,
  pre,
  add,
  remove,
  context,
  elision,
  gutter,
  showAll
};
