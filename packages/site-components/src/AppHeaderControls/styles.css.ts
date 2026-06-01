import { globalStyle, style } from '@vanilla-extract/css';
import { button, caption, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

const root = style([
  {
    alignItems: 'center',
    display: 'flex',
    gap: 'var(--salt-spacing-100)'
  },
  caption({ variant: 'caption6' }),
  responsiveSprinkles({
    marginLeft: ['x2', 'x2', 'x2', 'x2']
  })
]);

// Hide controls while the SSR wrapper class is present (set by `ThemeProvider`
// until hydration). Salt UI injects its component CSS at runtime, so without
// this the controls would briefly paint with native browser defaults.
// `visibility: hidden` preserves layout to prevent header reflow.
globalStyle(`.mosaic-ssr ${root}`, {
  visibility: 'hidden'
});

export default {
  root,
  menuButton: style([
    button({ variant: 'square' }),
    style({ lineHeight: 1 }),
    responsiveSprinkles({ marginLeft: ['x2', 'x2', 'x2', 'x2'] })
  ]),
  userInfo: responsiveSprinkles({
    display: ['none', 'flex', 'flex', 'flex']
  })
};
