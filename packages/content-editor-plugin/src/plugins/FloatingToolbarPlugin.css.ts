import { vars } from '@jpmorganchase/mosaic-theme';
import { globalStyle, style } from '@vanilla-extract/css';

const toolbar = style({
  minWidth: '100px'
});

export default {
  toolbar
};

globalStyle(`${toolbar} > *:not(:first-child)`, {
  marginLeft: vars.space.horizontal.none
});
