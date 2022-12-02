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
      paddingX: ['x4', 'x4', 'x6', 'x6']
    })
  ]),
  logoContainer: style({
    selectors: { ['a&']: { alignItems: 'center', display: 'flex', height: '100%' } }
  })
};
