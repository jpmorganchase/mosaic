import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

/**
 * Wrapper for the portaled-in formatting tooltrays. A flex row
 * inside the BaseToolbar's flex row, so the portal'd children
 * stay laid out as horizontal siblings exactly as they were
 * pre-Phase-10 when they were direct children of the toolbar.
 *
 * Mirrors BaseToolbar's inter-child margin rule so spacing
 * between the formatting tooltrays matches the spacing between
 * those tooltrays and the chrome tooltray on the right. Without
 * this rule the formatting tooltrays would butt up against each
 * other while the right-aligned chrome stayed properly spaced —
 * a small but visible regression.
 */
const root = style({
  display: 'flex',
  alignItems: 'center'
});

globalStyle(`${root} > *:not(:first-child)`, {
  marginLeft: vars.space.horizontal.x2
});

export default {
  root
};
