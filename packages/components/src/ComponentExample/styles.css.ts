import { style } from '@vanilla-extract/css';
import { componentExample, responsiveSprinkles, siteBorder } from '@jpmorganchase/mosaic-theme';

export default {
  component: componentExample({ backgroundColor: 'component' }),
  innerContainer: style([
    componentExample({ backgroundColor: 'inner' }),
    siteBorder({
      variant: 'boundary',
      borderTopWidth: 'thin',
      borderRightWidth: 'thin',
      borderBottomWidth: 'thin',
      borderLeftWidth: 'thin'
    })
  ]),
  root: style([
    style({
      width: '100%'
    }),
    style([componentExample({ backgroundColor: 'outer' })]),
    responsiveSprinkles({
      padding: ['x4', 'x4', 'x4', 'x4']
    })
  ])
};
