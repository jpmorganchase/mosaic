import { style } from '@vanilla-extract/css';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { responsiveConditions, responsiveSprinkles } from '../responsive';
import { paragraph } from '../typography';

export const tdSizeProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    minWidth: {
      mobile: vars.component.table.td.mobile.minWidth,
      tablet: vars.component.table.td.tablet.minWidth,
      web: vars.component.table.td.web.minWidth,
      desktop: vars.component.table.td.desktop.minWidth
    }
  }
});

export const tdSizeSprinkles = createSprinkles(tdSizeProperties);
export type TdSizeSprinkles = Parameters<typeof tdSizeSprinkles>[0];

export const td = recipe({
  base: style([
    {
      textAlign: 'left',
      verticalAlign: 'top'
    },
    paragraph({ variant: 'paragraph4' }),
    responsiveSprinkles({ padding: ['x4', 'x4', 'x4', 'x4'] }),
    tdSizeSprinkles({ minWidth: ['mobile', 'tablet', 'web', 'desktop'] })
  ])
});
export type TdVariants = RecipeVariants<typeof td>;
