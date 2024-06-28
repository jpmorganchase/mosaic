import { style } from '@vanilla-extract/css';
import { link, darkMode, lightMode, vars } from '@jpmorganchase/mosaic-theme';

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
          justifyContent: 'center',
          fontWeight: 'inherit'
        },
        [`${darkMode} [aria-expanded="true"][aria-haspopup="menu"].&`]: {
          background: 'inherit',
          color: vars.color.dark.navigable.selectableLink.unselectedLabel
        },
        [`${darkMode} [aria-expanded="true"][aria-haspopup="menu"].&:hover`]: {
          background: vars.color.dark.neutral.background.emphasis,
          color: vars.color.dark.navigable.selectableLink.unselectedLabel
        },
        [`${lightMode} [aria-expanded="true"][aria-haspopup="menu"].&`]: {
          background: 'inherit',
          color: vars.color.light.navigable.selectableLink.unselectedLabel
        },
        [`${lightMode} [aria-expanded="true"][aria-haspopup="menu"].&:hover`]: {
          background: vars.color.light.neutral.background.emphasis,
          color: vars.color.light.navigable.selectableLink.unselectedLabel
        }
      }
    },
    link({ variant: 'selectable' })
  ])
};
