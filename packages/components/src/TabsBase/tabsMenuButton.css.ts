import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, link } from '@jpmorganchase/mosaic-theme';

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
      paddingX: ['x2', 'x2', 'x2', 'x2']
    }),
    link({ variant: 'selectable' })
  ])
};
