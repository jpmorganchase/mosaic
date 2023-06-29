import { globalStyle, style } from '@vanilla-extract/css';
import { vars } from '@jpmorganchase/mosaic-theme';

const title = style({
  alignItems: 'center'
});

export default {
  title
};

globalStyle(`${title} [role=heading] `, {
  paddingLeft: vars.space.horizontal.x2
});
