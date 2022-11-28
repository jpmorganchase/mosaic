import { style } from '@vanilla-extract/css';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { responsiveConditions, responsiveSprinkles } from '../responsive';

export const tableSizeProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    maxWidth: {
      mobile: vars.component.table.mobile.maxWidth,
      tablet: vars.component.table.tablet.maxWidth,
      web: vars.component.table.web.maxWidth,
      desktop: vars.component.table.desktop.maxWidth
    }
  }
});

export const tableSizeSprinkles = createSprinkles(tableSizeProperties);
export type TableSizeSprinkles = Parameters<typeof tableSizeSprinkles>[0];

export const tableContainer = recipe({
  base: style([
    {
      overflowX: 'auto'
    },
    tableSizeSprinkles({ maxWidth: ['mobile', 'tablet', 'web', 'desktop'] })
  ])
});

export const table = recipe({
  base: style([
    {
      borderCollapse: 'collapse',
      display: 'table',
      width: '100%'
    },
    tableSizeSprinkles({ maxWidth: ['mobile', 'tablet', 'web', 'desktop'] })
  ]),
  variants: {
    context: {
      component: responsiveSprinkles({
        marginTop: ['none', 'none', 'none', 'none']
      }),
      markdown: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    }
  },
  defaultVariants: {
    context: 'component'
  }
});
export type TableVariants = RecipeVariants<typeof table>;
