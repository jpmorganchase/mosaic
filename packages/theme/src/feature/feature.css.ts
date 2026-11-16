import { style } from '@vanilla-extract/css';
import { RecipeVariants } from '@vanilla-extract/recipes';
import { recipe } from '../recipe';

import { responsiveSprinkles } from '../responsive';

export const feature = recipe({
  variants: {
    variant: {
      regular: style([
        {
          selectors: {
            ['&:first-child']: {
              marginTop: '0px'
            }
          }
        },
        responsiveSprinkles({
          marginTop: ['x13', 'x13', 'x13', 'x13']
        })
      ])
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type FeatureVariants = RecipeVariants<typeof feature>;
