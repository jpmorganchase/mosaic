import { style } from '@vanilla-extract/css';
import { backgroundColor, vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    backgroundColor({ variant: 'emphasis' }),
    style({
      overflow: 'hidden',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      padding: vars.space.horizontal.x1,
      height: '44px'
    })
  ])
};
