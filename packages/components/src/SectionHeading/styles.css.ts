import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, neutralBorder } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    neutralBorder({
      variant: 'low',
      borderLeftWidth: 'thick'
    }),
    responsiveSprinkles({
      paddingLeft: ['x4', 'x4', 'x4', 'x4'],
      marginBottom: ['none', 'none', 'x13', 'x13']
    })
  ])
};
