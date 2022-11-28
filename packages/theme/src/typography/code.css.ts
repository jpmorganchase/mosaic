import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { backgroundColor, foregroundColor } from '../color';

export const code = recipe({
  variants: {
    base: { display: 'inline' },
    variant: {
      regular: style([
        {
          fontSize: vars.fontSize.s70,
          selectors: {
            ['code.&']: {
              fontWeight: vars.fontWeight.light
            }
          }
        },
        backgroundColor({ variant: 'regular' }),
        foregroundColor({ variant: 'mid' })
      ])
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type CodeVariants = RecipeVariants<typeof code>;
