import { keyframes, style } from '@vanilla-extract/css';
import { button, neutralBorder, responsiveSprinkles, sidebar, config } from '@jpmorganchase/mosaic-theme';

const fadeIn = keyframes({
  '0%': { opacity: 0 },
  '100%': { opacity: 1 }
});

export default {
  sidebarLeft: style([
    style({
      flexShrink: 0,
      flexGrow: 0,
      zIndex: 1,
      width: `${config.sidebarLeft.width}px`
    }),
    neutralBorder({ variant: 'low', borderRightWidth: 'thin' }),
    sidebar({ variant: 'left' })
  ]),
  sidebarLeftDrawer: style([
    responsiveSprinkles({
      paddingTop: ['none', 'none', 'x6', 'x6']
    })
  ]),
  sidebarLeftEmpty: style([
    style({
      flexShrink: 0,
      zIndex: 1
    }),
    sidebar({ variant: 'leftEmpty' })
  ]),
  sidebarRight: style([
    style({
      flexShrink: 0,
      zIndex: 3,
      width: `${config.sidebarRight.width}px`
    }),
    sidebar({ variant: 'right' })
  ]),
  sidebarStickyArea: style([
    style({
      position: 'sticky',
      overflow: 'auto',
      height: `calc(100vh - ${config.appHeader.height}px)`,
      top: `${config.appHeader.height}px`
    }),
    responsiveSprinkles({
      paddingTop: ['x10', 'x10', 'x20', 'x20'],
      paddingBottom: ['x4', 'x4', 'x4', 'x4']
    })
  ]),
  toggleDrawer: style([
    {
      display: 'block',
      position: 'fixed',
      zIndex: 5
    },
    responsiveSprinkles({
      bottom: ['x6', 'x6', 'x6', 'x6'],
      right: ['x6', 'x6', 'x6', 'x6']
    })
  ]),
  toggleButton: button({ variant: 'square' }),
  closeDrawerButtonWrapper: style([
    {
      display: 'block',
      position: 'fixed',
      opacity: 0,
      animationDuration: '100ms',
      animationDelay: '225ms',
      animationFillMode: 'forwards',
      animationName: fadeIn
    },
    responsiveSprinkles({
      bottom: ['x6', 'x6', 'x6', 'x6'],
      right: ['x6', 'x6', 'x6', 'x6']
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
