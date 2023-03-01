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
    caption({ variant: 'caption6' }),
    responsiveSprinkles({
      marginLeft: ['x3', 'x3', 'x4', 'x4'],
      marginRight: 'none'
    })
  ]),
  logoContainer: style([
    {
      selectors: { ['a&']: { alignItems: 'center', display: 'flex', height: '100%' } }
    }
  ])
};
