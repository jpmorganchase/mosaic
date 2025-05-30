import { style } from '@vanilla-extract/css';
import {
  action,
  link,
  responsiveSprinkles,
  navigableBorder,
  vars
} from '@jpmorganchase/mosaic-theme';

export default {
  menuItems: style([
    {
      display: 'flex',
      height: '44px'
    },
    action({ variant: 'action1' })
  ]),
  menuButton: style([
    {
      cursor: 'pointer',
      selectors: {
        ['div.&']: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      }
    },
    link({ variant: 'selectable' }),
    responsiveSprinkles({
      paddingX: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  menuLink: style([
    {
      selectors: {
        ['a.&']: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      fontSize: vars.fontSize.s50
    },
    link({ variant: 'selectable' }),
    responsiveSprinkles({
      paddingX: ['x2', 'x2', 'x2', 'x2']
    })
  ]),
  flexContainer: style({
    display: 'flex',
    position: 'relative'
  }),
  hideOnFirstRender: style({
    display: 'none'
  }),
  menuIndicator: style({
    cursor: 'pointer',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    content: '',
    width: '100%'
  }),
  menuIndicatorHover: style([navigableBorder({ variant: 'hover', borderBottomWidth: 'medium' })]),
  menuIndicatorSelected: style([
    navigableBorder({ variant: 'selected', borderBottomWidth: 'medium' }),
    { transition: 'left 0.3s, width 0.3s' }
  ])
};
