import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const siteBorder = recipe({
  base: {
    outlineOffset: '0px',
    borderWidth: '0px'
  },
  variants: {
    variant: {
      unknown: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.unknown,
          darkMode: vars.color.unknown
        }
      }),
      boundary: borderSprinkles({
        borderStyle: 'dashed',
        borderColor: {
          lightMode: vars.color.light.neutral.foreground.low,
          darkMode: vars.color.dark.neutral.foreground.low
        }
      })
    },
    ...createWidthVariants()
  },
  defaultVariants: {
    variant: 'unknown'
  }
});
export type SiteBorderVariants = RecipeVariants<typeof siteBorder>;
