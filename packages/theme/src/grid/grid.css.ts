import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveConditions, responsiveSprinkles } from '../responsive';
import { vars } from '../vars.css';

export const gridProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    gridTemplateColumns: vars.component.grid.column,
    gridTemplateRows: vars.component.grid.row
  }
});

export const gridSprinkles = createSprinkles(gridProperties);
export type GridSprinkles = Parameters<typeof gridSprinkles>[0];

export const grid = recipe({
  variants: {
    size: {
      small: style([
        gridSprinkles({
          gridTemplateColumns: ['mobileSmall', 'tabletSmall', 'webSmall', 'desktopSmall'],
          gridTemplateRows: ['mobileSmall', 'tabletSmall', 'webSmall', 'desktopSmall']
        }),
        responsiveSprinkles({ gap: ['x2', 'x2', 'x2', 'x2'] })
      ]),
      medium: style([
        gridSprinkles({
          gridTemplateColumns: ['mobileMedium', 'tabletMedium', 'webMedium', 'desktopMedium'],
          gridTemplateRows: ['mobileMedium', 'tabletMedium', 'webMedium', 'desktopMedium']
        }),
        responsiveSprinkles({ gap: ['x4', 'x4', 'x4', 'x4'] })
      ]),
      large: style([
        gridSprinkles({
          gridTemplateColumns: ['mobileLarge', 'tabletLarge', 'webLarge', 'desktopLarge'],
          gridTemplateRows: ['mobileLarge', 'tabletLarge', 'webLarge', 'desktopLarge']
        }),
        responsiveSprinkles({ gap: ['x6', 'x6', 'x6', 'x6'] })
      ]),
      fullWidth: style([
        {
          gridTemplateColumns: '100%'
        },
        responsiveSprinkles({ rowGap: ['x2', 'x2', 'x2', 'x2'] })
      ]),
      fitContent: style([
        {
          gridTemplateColumns: '100%',
          gridTemplateRows: 'fit-content(100%)'
        },
        responsiveSprinkles({ gap: ['x2', 'x2', 'x2', 'x2'] })
      ])
    }
  },
  defaultVariants: {
    size: 'small'
  }
});
export type GridVariants = RecipeVariants<typeof grid>;
