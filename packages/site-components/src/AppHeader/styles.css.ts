import { globalStyle, style } from '@vanilla-extract/css';
import { caption, responsiveSprinkles, vars } from '@jpmorganchase/mosaic-theme';

const logoImage = style({
  display: 'flex',
  selectors: {
    '[data-mode=dark] &': {
      filter: 'invert(1)'
    }
  }
});

export default {
  root: style([
    {
      flexGrow: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    caption({ variant: 'caption6' }),
    responsiveSprinkles({
      marginLeft: ['x6'],
      marginRight: ['x6']
    })
  ]),
  logo: style([
    style({
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      height: 'var(--salt-size-base)'
    }),
    responsiveSprinkles({ gap: ['x2'] })
  ]),
  logoImage,
  logoContainer: style([
    {
      fontSize: vars.fontSize.s50,
      selectors: { ['a&']: { alignItems: 'center', display: 'flex', height: '100%' } }
    }
  ]),
  logoDivider: style({
    height: 'calc(var(--salt-size-base) - var(--salt-spacing-100))',
    alignSelf: 'unset'
  })
};

globalStyle(`${logoImage} img`, {
  maxHeight: 'var(--salt-size-base)'
});
