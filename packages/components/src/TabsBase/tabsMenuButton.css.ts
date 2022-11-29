import { style } from '@vanilla-extract/css';
import { backgroundColor, responsiveSprinkles, link, vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      selectors: {
        ['&:active']: { backgroundColor: 'inherit' },
        ['button.&']: {
          color: 'inherit',
          fontFamily: 'inherit',
          height: '100%',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          textDecoration: 'none',
          justifyContent: 'center'
        }
      }
    },
    responsiveSprinkles({
      paddingX: ['none', 'none', 'none', 'none']
    }),
    link({ variant: 'selectable' })
  ])
};
