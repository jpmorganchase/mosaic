import { style } from '@vanilla-extract/css';
import {
  button,
  config,
  neutralBorder,
  responsiveSprinkles,
  sidebar
} from '@jpmorganchase/mosaic-theme';

export default {
  sidebarLeftDrawer: style([{ zIndex: '-1' }]),
  menuAnchor: {
    height: 'auto',
    minHeight: '35px',
    backgroundColor: 'inherit',
    fontWeight: 'var(--fontWeight-regular)'
  },
  menuLabel: {
    fontSize: '12px',
    whiteSpace: 'normal'
  },
  toggleButton: style([
    {
      flexShrink: 0,
      width: `${config.appHeader.height}px`,
      height: `${config.appHeader.height}px`
    },
    neutralBorder({
      variant: 'low',
      borderRightWidth: 'thin'
    }),
    button({ variant: 'square' })
  ]),
  toggleButtonInctive: style([
    style({
      background: 'inherit !important'
    })
  ]),
  toggleButtonActive: style([
    style({
      boxShadow: 'inset white 0 0 0 6px'
    })
  ]),
  drawerInner: style([
    style({
      bottom: 0,
      overflowY: 'scroll',
      top: `${config.appHeader.height}px`,
      height: `calc(100% - ${config.appHeader.height}px)`
    }),
    sidebar({ variant: 'drawer' }),
    responsiveSprinkles({
      paddingTop: ['x6', 'x6', 'none', 'none'],
      paddingBottom: ['x6', 'x6', 'none', 'none']
    })
  ]),
  drawerButton: style({
    display: 'none'
  })
};
