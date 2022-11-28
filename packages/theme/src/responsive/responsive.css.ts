import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { calc } from '@vanilla-extract/css-utils';

import { breakpoint } from './breakpoint';
import { vars } from '../vars.css';

export const responsiveConditions = {
  mobile: { '@media': `screen and (min-width: ${breakpoint.mobile}px)` },
  tablet: { '@media': `screen and (min-width: ${breakpoint.tablet}px)` },
  web: { '@media': `screen and (min-width: ${breakpoint.web}px)` },
  desktop: { '@media': `screen and (min-width: ${breakpoint.desktop}px)` }
};

export const marginProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    marginTop: vars.space.vertical,
    marginRight: vars.space.horizontal,
    marginBottom: vars.space.vertical,
    marginLeft: vars.space.horizontal
  },
  shorthands: {
    margin: ['marginTop', 'marginBottom', 'marginLeft', 'marginRight'],
    marginX: ['marginLeft', 'marginRight'],
    marginY: ['marginTop', 'marginBottom']
  }
});

export const paddingProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    paddingTop: vars.space.vertical,
    paddingRight: vars.space.horizontal,
    paddingBottom: vars.space.vertical,
    paddingLeft: vars.space.horizontal
  },
  shorthands: {
    padding: ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'],
    paddingX: ['paddingLeft', 'paddingRight'],
    paddingY: ['paddingTop', 'paddingBottom']
  }
});

export const positionProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    top: vars.space.vertical,
    right: vars.space.horizontal,
    bottom: vars.space.vertical,
    left: vars.space.horizontal
  }
});

export const responsiveProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    display: ['none', 'flex', 'initial', 'inherit'],
    flexDirection: ['row', 'row-reverse', 'column', 'column-reverse'],
    flexWrap: ['wrap', 'nowrap'],
    width: ['100%']
  }
});

export const gapProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    columnGap: vars.space.horizontal,
    rowGap: vars.space.vertical
  },
  shorthands: {
    gap: ['columnGap', 'rowGap']
  }
});

export const marginSprinkles = createSprinkles(marginProperties);
export type MarginSprinkles = Parameters<typeof marginSprinkles>[0];

export const paddingSprinkles = createSprinkles(paddingProperties);
export type PaddingSprinkles = Parameters<typeof paddingSprinkles>[0];

export const positioningSprinkles = createSprinkles(positionProperties);
export type PositioningSprinkles = Parameters<typeof positioningSprinkles>[0];

export const gapSprinkles = createSprinkles(gapProperties);
export type GapSprinkles = Parameters<typeof gapSprinkles>[0];

export const responsiveSprinkles = createSprinkles(
  marginProperties,
  paddingProperties,
  positionProperties,
  responsiveProperties,
  gapProperties
);

export type ResponsiveSprinkles = Parameters<typeof responsiveSprinkles>[0];

export const gutterElement = recipe({
  variants: {
    variant: {
      anchor: {
        marginLeft: vars.space.horizontal.anchor
      },
      accent: {
        marginLeft: vars.space.horizontal.gutter,
        paddingLeft: calc(vars.space.horizontal.gutter)
          .multiply(-1)
          .subtract(vars.border.width.thick)
          .toString()
      }
    }
  }
});

export type GutterElementVariants = RecipeVariants<typeof gutterElement>;
