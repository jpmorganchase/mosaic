import { responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';
import { style } from '@vanilla-extract/css';

export default {
  root: style([
    style({
      maxWidth: '100vw',
      marginLeft: vars.space.horizontal.x10,
      marginRight: vars.space.horizontal.x10
    }),
    responsiveSprinkles({
      marginTop: ['x6', 'x6', 'x10', 'x10']
    })
  ])
};
