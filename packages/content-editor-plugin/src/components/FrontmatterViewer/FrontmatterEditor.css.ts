import { style } from '@vanilla-extract/css';

/**
 * Editable frontmatter form styles. Sibling to
 * `FrontmatterViewer.css.ts` (the read-only fallback) and
 * deliberately consistent with its banner / source-label
 * conventions so flipping from one to the other on a different
 * page doesn't look like a different UI.
 */

const root = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%'
});

const banner = style({
  flexShrink: 0,
  marginBottom: 12
});

const sourceLabel = style({
  flexShrink: 0,
  marginBottom: 8,
  paddingInline: 12,
  fontSize: '0.6875rem',
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--salt-content-secondary-foreground, currentColor)',
  opacity: 0.75
});

const dirtyDot = style({
  textTransform: 'none',
  letterSpacing: 0,
  fontWeight: 500,
  opacity: 0.9,
  color: 'var(--salt-status-warning-foreground, currentColor)'
});

const form = style({
  flex: '1 1 auto',
  overflow: 'auto',
  paddingInline: 12,
  paddingBottom: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 16
});

const row = style({
  // Horizontal layout: the FormField takes all available space
  // (label + necessity + input + helper text stacked vertically
  // inside it), the remove (×) button sits to the right aligned
  // with the input itself. `flex-end` on the cross-axis would
  // pin the × to the bottom — instead we use a small top
  // padding to optically align it with the FormField's input
  // row, accounting for the label sitting above.
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8
});

const formField = style({
  // FormField defaults to inline-flex shrink behaviour; stretch
  // it to consume the row's available width so multi-line inputs
  // (textareas for description/sidebar) get the full column.
  flex: '1 1 auto',
  minWidth: 0
});

// Reserve vertical space matching the FormField's label height so
// the × button visually aligns with the input row rather than
// floating at the very top of the row. 22px ≈ Salt's small
// label line-height + bottom spacing; eyeballed to match.
const removeButton = style({
  flexShrink: 0,
  marginTop: 22,
  minWidth: 'auto',
  paddingInline: 8,
  fontSize: '1.25rem',
  lineHeight: 1
});

const textarea = style({
  width: '100%',
  padding: 8,
  fontFamily: 'inherit',
  fontSize: '0.875rem',
  lineHeight: 1.5,
  borderRadius: 4,
  border: '1px solid var(--salt-separable-borderColor, currentColor)',
  background: 'var(--salt-editable-background, transparent)',
  color: 'inherit',
  resize: 'vertical'
});

// Complex (YAML island) textarea — monospace so indentation
// reads correctly, and a slightly different background so it's
// obvious at a glance that this row is "raw mode" not a
// scalar widget.
const complexTextarea = style({
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, "Liberation Mono", monospace',
  tabSize: 2,
  background: 'var(--salt-container-secondary-background, transparent)'
});

const error = style({
  color: 'var(--salt-status-error-foreground, currentColor)',
  fontSize: '0.8125rem'
});

const empty = style({
  paddingBlock: 24,
  textAlign: 'center',
  opacity: 0.6
});

const addRow = style({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  paddingTop: 12,
  borderTop: '1px solid var(--salt-separable-borderColor, currentColor)'
});

const addInput = style({
  flex: '1 1 auto'
});

const addField = style({
  minWidth: 'fit-content'
});

export default {
  root,
  banner,
  sourceLabel,
  dirtyDot,
  form,
  row,
  formField,
  removeButton,
  textarea,
  complexTextarea,
  error,
  empty,
  addRow,
  addInput,
  addField
};
