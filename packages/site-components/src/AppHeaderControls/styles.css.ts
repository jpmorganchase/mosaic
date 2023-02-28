import { style } from '@vanilla-extract/css';
import { button, caption, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      alignItems: 'center',
      display: 'flex'
    },
    caption({ variant: 'caption6' }),
    responsiveSprinkles({
      marginLeft: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  menuButton: style([
    button({ variant: 'square' }),
    responsiveSprinkles({ marginLeft: ['x2', 'x2', 'x2', 'x2'] })
  ]),
  userInfo: responsiveSprinkles({
    display: ['none', 'flex', 'flex', 'flex']
  })
};
