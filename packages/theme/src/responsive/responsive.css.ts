import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

import { breakpoint } from './breakpoint';
import { spaceVars } from './vars.css';

export const responsiveConditions = {
  mobile: { '@media': `screen and (min-width: ${breakpoint.mobile}px)` },
  tablet: { '@media': `screen and (min-width: ${breakpoint.tablet}px)` },
  web: { '@media': `screen and (min-width: ${breakpoint.web}px)` },
  desktop: { '@media': `screen and (min-width: ${breakpoint.desktop}px)` }
};

export const responsiveProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    // margin
    marginTop: spaceVars.vertical,
    marginRight: spaceVars.horizontal,
    marginBottom: spaceVars.vertical,
    marginLeft: spaceVars.horizontal,
    // padding
    paddingTop: spaceVars.vertical,
    paddingRight: spaceVars.horizontal,
    paddingBottom: spaceVars.vertical,
    paddingLeft: spaceVars.horizontal,
    // position
    top: spaceVars.vertical,
    right: spaceVars.horizontal,
    bottom: spaceVars.vertical,
    left: spaceVars.horizontal,
    // flexbox
    display: ['none', 'flex', 'initial', 'inherit'],
    flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
    flexWrap: ['wrap', 'nowrap'],
    width: ['100%'],
    // gap
    columnGap: spaceVars.horizontal,
    rowGap: spaceVars.vertical
  },
  shorthands: {
    margin: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'],
    marginX: ['marginLeft', 'marginRight'],
    marginY: ['marginTop', 'marginBottom'],
    padding: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'],
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom'],
    gap: ['columnGap', 'rowGap']
  }
});

export const responsiveSprinkles = createSprinkles(responsiveProperties);

export type ResponsiveSprinkles = Parameters<typeof responsiveSprinkles>[0];
