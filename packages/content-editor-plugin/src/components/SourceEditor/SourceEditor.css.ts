import { style } from '@vanilla-extract/css';

/**
 * Source-mode textarea styling.
 *
 * Monospaced + theme-neutral so it reads on light and dark Salt
 * themes without us having to plumb in mode-aware tokens. The
 * background is intentionally transparent — the parent
 * `ScrollableSection` provides the surface — so the textarea
 * inherits whatever the editor pane's container uses and we don't
 * end up with a white-on-dark or vice-versa mismatch.
 *
 * Tab handling is left to the browser default rather than wired up
 * to insert a tab character: web textareas eating tab is a known
 * a11y footgun (Tab is the standard way to leave the field), and
 * markdown isn't tab-significant anyway.
 */
const textarea = style({
  width: '100%',
  height: '100%',
  // The host's ScrollableSection already provides the scroll
  // viewport; we just want the textarea to grow and let that
  // wrapper handle overflow. `resize: none` so users don't get a
  // browser-default drag handle that would distort the split
  // pane.
  resize: 'none',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: 'inherit',
  padding: 12,
  margin: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, "Liberation Mono", monospace',
  fontSize: '0.875rem',
  lineHeight: 1.55,
  // `tab-size: 2` so any literal tabs in the markdown render at
  // the same width as two spaces, matching the convention in our
  // existing markdown content.
  tabSize: 2,
  // Wrap long lines visually but don't insert hard newlines —
  // markdown source IS line-significant.
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word'
});

export default {
  textarea
};
