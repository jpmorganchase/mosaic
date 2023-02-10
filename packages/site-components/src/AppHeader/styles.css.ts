import { style } from '@vanilla-extract/css';
import { caption, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      flexGrow: 1,
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'space-between'
    },
    caption({ variant: 'caption6' })
  ]),
  logoContainer: style([
    {
      selectors: { ['a&']: { alignItems: 'center', display: 'flex', height: '100%' } }
    },
    responsiveSprinkles({
      paddingLeft: ['x3', 'x3', 'x6', 'x6']
    })
  ])
};
