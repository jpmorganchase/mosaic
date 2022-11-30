import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    responsiveSprinkles({
      marginBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  link: style([
    style({ display: 'block' }),
    responsiveSprinkles({
      paddingLeft: ['x4', 'x4', 'x4', 'x4'],
      paddingRight: ['x3', 'x3', 'x3', 'x3'],
      marginBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ])
};
