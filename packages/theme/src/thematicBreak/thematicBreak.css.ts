import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { foregroundColor } from '../color';

export const thematicBreak = recipe({
  variants: {
    variant: {
      regular: style([
        foregroundColor({ variant: 'mid' }),
        responsiveSprinkles({ marginY: ['x10', 'x10', 'x10', 'x10'] })
      ])
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type ThematicBreakVariants = RecipeVariants<typeof thematicBreak>;
