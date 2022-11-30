import { style } from '@vanilla-extract/css';
import { config, responsiveSprinkles, caption } from '@dpmosaic/theme';

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
  searchInput: responsiveSprinkles({
    display: ['none', 'none', 'flex', 'flex'],
    marginRight: ['x3', 'x3', 'x3', 'x3']
  }),
  menuButton: style({
    height: `${config.appHeader.height}px`
  }),
  userInfo: responsiveSprinkles({
    display: ['none', 'flex', 'flex', 'flex']
  })
};
