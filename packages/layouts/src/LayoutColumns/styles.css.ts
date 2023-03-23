import { style } from '@vanilla-extract/css';
import {
  button,
  config,
  responsiveConditions,
  responsiveSprinkles,
  vars
} from '@jpmorganchase/mosaic-theme';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

const gridTemplates = {
  wide: `minmax(${vars.space.none}, 500px) minmax(auto, ${config.main.wideWidth}px) minmax(${vars.space.none}, 500px)`,
  small: '1fr'
};

const rootGridProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    gridTemplateColumns: [gridTemplates.small, gridTemplates.wide],
    gridGap: vars.space.horizontal
  }
});

const rootGridSprinkles = createSprinkles(rootGridProperties);

const styles = {
  root: style([
    style({
      display: 'grid',
      alignItems: 'start',
      gridTemplateColumns: `minmax(${vars.space.none}, 500px) minmax(auto, ${config.main.wideWidth}px) minmax(${vars.space.none}, 500px)`,
      gridTemplateAreas: `
      "layout-column-sidebar layout-column-main layout-column-toc"`
    }),
    responsiveSprinkles({
      marginTop: ['x10', 'x10', 'x20', 'x20'],
      paddingLeft: ['x4', 'x6', 'x6', 'x6'],
      paddingRight: ['x4', 'x6', 'x6', 'x6']
    }),
    rootGridSprinkles({
      gridTemplateColumns: [
        gridTemplates.small,
        gridTemplates.small,
        gridTemplates.small,
        gridTemplates.wide
      ],
      gridGap: ['none', 'none', 'x8', 'x8']
    })
  ]),

  main: style({
    gridArea: 'layout-column-main',
    justifyContent: 'center',
    flexDirection: 'column',
    display: 'flex',
    width: '100%',
    marginRight: 'auto',
    marginLeft: 'auto'
  }),
  sidebar: style({
    gridArea: 'layout-column-sidebar',
    position: 'sticky',
    top: `${config.appHeader.height}px`
  }),
  toc: style({
    gridArea: 'layout-column-toc',
    position: 'sticky',
    top: `${config.appHeader.height}px`
  }),

  toggleButton: style([
    {
      selectors: {
        ['.saltButton.&']: {
          display: 'block',
          position: 'fixed',
          zIndex: 5
        }
      }
    },
    button({ variant: 'square' }),
    responsiveSprinkles({
      bottom: ['x6', 'x6', 'x6', 'x6'],
      right: ['x6', 'x6', 'x6', 'x6']
    })
  ])
};

export default styles;
