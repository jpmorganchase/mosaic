import { style } from '@vanilla-extract/css';
import { RecipeVariants } from '@vanilla-extract/recipes';
import { recipe } from '../recipe';

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
