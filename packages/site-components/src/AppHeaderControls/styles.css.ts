import { style } from '@vanilla-extract/css';
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
