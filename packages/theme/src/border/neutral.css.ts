import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const neutralBorder = recipe({
  base: {
    outlineOffset: '0px',
    borderWidth: '0px'
  },
  variants: {
    variant: {
      low: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.neutral.foreground.low,
          darkMode: vars.color.dark.neutral.foreground.low
        }
      }),
      mid: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.neutral.foreground.mid,
          darkMode: vars.color.dark.neutral.foreground.mid
        }
      }),
      high: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.neutral.foreground.high,
          darkMode: vars.color.dark.neutral.foreground.high
        }
      })
    },
    ...createWidthVariants()
  },
  defaultVariants: {
    variant: 'high'
  }
});
export type NeutralBorderVariants = RecipeVariants<typeof neutralBorder>;
