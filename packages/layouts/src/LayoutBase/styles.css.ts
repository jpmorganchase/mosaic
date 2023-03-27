import { style, globalStyle } from '@vanilla-extract/css';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import {
  backgroundColor,
  config,
  foregroundColor,
  neutralBorder,
  paragraph,
  responsiveConditions,
  shadow
} from '@jpmorganchase/mosaic-theme';

globalStyle('#__next', {
  height: '100%'
});

const headerGridProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    gridTemplateColumns: [`${config.appHeader.height}px auto`, '10% auto', 'auto']
  }
});

const headerGridSprinkles = createSprinkles(headerGridProperties);

export default {
  root: style([
    {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gridTemplateAreas: `
      "base-layout-header"
      "base-layout-main"`
    },
    paragraph({ variant: 'paragraph2' }),
    backgroundColor({ variant: 'regular' }),
    foregroundColor({ variant: 'high' })
  ]),

  main: style({
    gridArea: 'base-layout-main',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1
  }),

  header: style([
    {
      display: 'grid',
      height: `${config.appHeader.height}px`,
      gridArea: 'base-layout-header',
      position: 'sticky',
      top: 0,
      // This is high so that the header can overlay the Salt component for mobile
      // sidebars and menus. If Drawer (with a zIndex of 1300) is ever refactored, we should reduce
      // this to a more sensible number.
      zIndex: 1500
    },
    backgroundColor({ variant: 'regular' }),
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' }),
    shadow({ variant: 'elevation2' }),
    headerGridSprinkles({
      gridTemplateColumns: [
        `${config.appHeader.height}px auto`,
        `${config.appHeader.height}px auto`,
        'auto',
        'auto'
      ]
    })
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
