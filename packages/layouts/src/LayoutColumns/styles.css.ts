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
  allAreas: `
      "layout-column-sidebar layout-column-main layout-column-toc"`,
  mainAreaOnly: `"layout-column-main"`,
  allColumns: `minmax(300px, 1fr) minmax(min-content, ${config.main.wideWidth}px) minmax(282px, 1fr)`,
  fullWidthContent: '1fr'
};

const rootGridProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    gridTemplateAreas: [gridTemplates.allAreas, gridTemplates.mainAreaOnly],
    gridTemplateColumns: [gridTemplates.fullWidthContent, gridTemplates.allColumns],
    gridGap: vars.space.horizontal
  }
});

const rootGridSprinkles = createSprinkles(rootGridProperties);

const styles = {
  root: style([
    style({
      display: 'grid',
      alignItems: 'start'
    }),
    responsiveSprinkles({
      marginTop: ['x10', 'x10', 'x20', 'x20'],
      paddingLeft: ['x4', 'x6', 'x6', 'x6'],
      paddingRight: ['x4', 'x6', 'x6', 'x6']
    }),
    rootGridSprinkles({
      gridTemplateAreas: {
        mobile: gridTemplates.mainAreaOnly,
        tablet: gridTemplates.mainAreaOnly,
        desktop: gridTemplates.allAreas,
        web: gridTemplates.allAreas
      },
      gridTemplateColumns: {
        mobile: gridTemplates.fullWidthContent,
        tablet: gridTemplates.fullWidthContent,
        desktop: gridTemplates.allColumns,
        web: gridTemplates.allColumns
      },
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
    top: `${config.appHeader.height}px`,
    maxWidth: '500px'
  }),
  toc: style({
    gridArea: 'layout-column-toc',
    position: 'sticky',
    top: `${config.appHeader.height}px`,
    maxWidth: '500px'
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
