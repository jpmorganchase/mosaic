import { style } from '@vanilla-extract/css';
import { caption, responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';

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
      marginLeft: ['x6'],
      marginRight: ['x6']
    })
  ]),
  logoContainer: style([
    {
      fontSize: vars.fontSize.s50,
      selectors: { ['a&']: { alignItems: 'center', display: 'flex', height: '100%' } }
    }
  ])
};
