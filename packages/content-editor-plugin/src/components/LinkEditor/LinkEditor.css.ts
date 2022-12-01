import { style } from '@vanilla-extract/css';
import { vars, neutralBorder } from '@jpmorganchase/mosaic-theme';

export default {
  popper: style([
    style({
      padding: vars.space.vertical.x1,
      marginLeft: vars.space.horizontal.x2
    }),
    neutralBorder({
      variant: 'low',
      borderWidth: 'thin'
    })
  ])
};
