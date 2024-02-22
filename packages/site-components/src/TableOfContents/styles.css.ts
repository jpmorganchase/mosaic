import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  list: style([
    style({
      listStyle: 'none'
    }),
    responsiveSprinkles({
      marginTop: ['x4', 'x4', 'x4', 'x4'],
      marginBottom: ['x6', 'x6', 'x6', 'x6'],
      padding: ['none', 'none', 'none', 'none']
    })
  ])
};
