import { style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    width: '28px',
    height: '28px',
    lineHeight: 1,
    padding: vars.space.horizontal.none
  })
};
