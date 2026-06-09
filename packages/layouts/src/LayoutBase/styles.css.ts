import { style } from '@vanilla-extract/css';
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

const headerGridProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    gridTemplateColumns: [`${config.appHeader.height}px auto`, '10% auto', 'auto']
  }
});

const headerGridSprinkles = createSprinkles(headerGridProperties);

// Loading UI lives in route-segment `loading.tsx` files in App Router
// consumers; no overlay primitives are emitted here.
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
    zIndex: 1,
    minHeight: `calc(100vh - ${config.appHeader.height}px)`
  }),

  header: style([
    {
      display: 'grid',
      alignItems: 'center',
      height: `${config.appHeader.height}px`,
      gridArea: 'base-layout-header',
      position: 'sticky',
      top: 0,
      zIndex: 2
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
  ])
};
