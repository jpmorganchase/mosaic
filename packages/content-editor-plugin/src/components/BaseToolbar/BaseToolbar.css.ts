import { globalStyle, style } from '@vanilla-extract/css';
import { backgroundColor, vars } from '@jpmorganchase/mosaic-theme';

const root = style([
  backgroundColor({ variant: 'emphasis' }),
  style({
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    padding: vars.space.horizontal.x1,
    height: '44px'
  })
]);
export default {
  root
};

globalStyle(`${root} > *:not(:first-child)`, {
  marginLeft: vars.space.horizontal.x2
});
