import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

const title = style({
  alignItems: 'center'
});

// Top breathing room so the diff accordion sits clear of the info
// paragraphs above it.
const diffAccordion = style({
  marginTop: vars.space.vertical.x2
});

// "No changes" copy is informational; render it muted so it doesn't
// fight the primary "Raise Pull Request" CTA for attention.
const noChanges = style({
  marginTop: vars.space.vertical.x2,
  opacity: 0.75,
  fontStyle: 'italic'
});

// Inline stat colours mirror the diff line tints so the header is
// scannable at a glance without opening the accordion.
const statAdd = style({
  color: 'rgb(46, 160, 67)'
});
const statRemove = style({
  color: 'rgb(248, 81, 73)'
});

// Rename row — labelled input above the diff accordion for the
// in-flow rename feature. Understated so it doesn't compete with
// the primary CTA.
const renameRow = style({
  marginTop: vars.space.vertical.x2,
  display: 'flex',
  flexDirection: 'column',
  gap: vars.space.vertical.x1
});

const renameLabel = style({
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.03em',
  textTransform: 'uppercase',
  opacity: 0.75
});

const renameHint = style({
  fontSize: '0.75rem',
  opacity: 0.6
});

const renameError = style({
  fontSize: '0.8125rem',
  color: 'var(--salt-status-error-foreground, currentColor)'
});

export default {
  title,
  diffAccordion,
  noChanges,
  statAdd,
  statRemove,
  renameRow,
  renameLabel,
  renameHint,
  renameError
};

globalStyle(`${title} [role=heading] `, {
  paddingLeft: vars.space.horizontal.x2
});
