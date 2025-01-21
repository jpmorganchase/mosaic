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
      "base-layout-hero"
      "base-layout-main"`
    },
    paragraph({ variant: 'paragraph2' }),
    backgroundColor({ variant: 'regular' }),
    foregroundColor({ variant: 'high' })
  ]),
  content: style({
    width: '70%',
    margin: '0 auto'
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
  ]),

  hero: style({
    gridArea: 'base-layout-hero'
  }),

  main: style({
    gridArea: 'base-layout-main',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1,
    minHeight: `calc(100vh - ${config.appHeader.height}px)`,
    padding: 'var(--salt-spacing-300)',
    gap: 'var(--salt-spacing-300)'
  })
};
