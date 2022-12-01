import { style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style({
    padding: vars.space.horizontal.x3,
    maxHeight: '100vh',
    overflow: 'scroll'
  })
};
