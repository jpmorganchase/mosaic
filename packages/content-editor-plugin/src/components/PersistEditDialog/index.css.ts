import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

const title = style({
  alignItems: 'center'
});

// Phase 9: a little top breathing room so the diff accordion sits
// clear of the info paragraphs above it.
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

export default {
  title,
  diffAccordion,
  noChanges,
  statAdd,
  statRemove
};

globalStyle(`${title} [role=heading] `, {
  paddingLeft: vars.space.horizontal.x2
});
