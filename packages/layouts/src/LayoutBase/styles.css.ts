import { style, globalStyle } from '@vanilla-extract/css';
import {
  backgroundColor,
  config,
  foregroundColor,
  neutralBorder,
  paragraph,
  shadow
} from '@jpmorganchase/mosaic-theme';

globalStyle('#__next', {
  height: '100%'
});

export default {
  root: style([
    {
      minHeight: '100vh'
    },
    paragraph({ variant: 'paragraph2' }),
    backgroundColor({ variant: 'regular' }),
    foregroundColor({ variant: 'high' })
  ]),

  main: style({
    width: '100%',
    zIndex: 1,
    position: 'relative'
  }),

  header: style([
    {
      display: 'flex',
      justifyContent: 'stretch',
      alignItems: 'center',
      height: `${config.appHeader.height}px`,
      width: '100%',
      position: 'sticky',
      top: 0,
      // This is high so that the header can overlay the UITK component for mobile
      // sidebars and menus. If Drawer (with a zIndex of 1300) is ever refactored, we should reduce
      // this to a more sensible number.
      zIndex: 1500
    },
    backgroundColor({ variant: 'regular' }),
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' }),
    shadow({ variant: 'elevation2' })
  ]),

  overlayRoot: style([
    {
      zIndex: 1501,
      top: 0,
      bottom: 0,
      position: 'fixed',
      display: 'flex',
      left: 0,
      right: 0,
      justifyContent: 'center',
      alignItems: 'center'
    }
  ]),

  overlayInner: style([
    backgroundColor({ variant: 'regular' }),
    {
      opacity: 0.95,
      position: 'absolute',
      width: '100%',
      height: '100%'
    }
  ])
};
