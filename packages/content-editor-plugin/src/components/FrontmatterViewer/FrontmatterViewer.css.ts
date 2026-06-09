import { style } from '@vanilla-extract/css';

/**
 * Frontmatter-mode read-only viewer styling.
 *
 * Two stacked regions inside the left pane:
 *
 *   - `banner`: the "read-only" notice. Sticky-free (lives in
 *     normal flow) so on tiny viewports it scrolls away with
 *     the content rather than eating screen real estate.
 *   - `pre`: the formatted YAML. Monospaced + theme-neutral
 *     background so it reads on light and dark Salt themes
 *     without dragging in mode-aware tokens, matching the
 *     SourceEditor textarea convention.
 *
 * `whiteSpace: 'pre'` (not `'pre-wrap'`) on the `<pre>` itself:
 * YAML is indentation-significant and wrapped lines would
 * misrepresent nesting. The parent `ScrollableSection`
 * already provides horizontal overflow handling for long
 * lines.
 */

const root = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  width: '100%'
});

const banner = style({
  // The Salt Banner ships with its own borders / spacing. We
  // only need to make sure it doesn't expand to fill the
  // remaining height when the `<pre>` below has little
  // content — `flexShrink: 0` is the cleanest way to pin its
  // height to its own intrinsic size.
  flexShrink: 0,
  marginBottom: 12
});

// One-line caption between the banner and the YAML pane that
// names the data source on screen ("On-disk source" vs
// "Rendered view (post-plugin)"). Deliberately understated —
// it's a wayfinding aid, not a status badge, so we use the
// muted Salt foreground token and small uppercase tracking
// rather than a coloured pill that would compete with the
// banner above it.
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

const pre = style({
  flex: '1 1 auto',
  margin: 0,
  padding: 12,
  background: 'transparent',
  color: 'inherit',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, "Liberation Mono", monospace',
  fontSize: '0.875rem',
  lineHeight: 1.55,
  tabSize: 2,
  whiteSpace: 'pre',
  overflow: 'auto',
  // A subtle focus ring so the `tabIndex=0` affordance is
  // discoverable by keyboard users — Salt's default focus
  // tokens would be off-brand here, so we use the standard
  // focus-visible inset shadow pattern.
  outline: 'none',
  selectors: {
    '&:focus-visible': {
      boxShadow: 'inset 0 0 0 2px var(--salt-focused-borderColor)'
    }
  }
});

export default {
  root,
  banner,
  sourceLabel,
  pre
};
