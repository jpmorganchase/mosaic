import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const brandBorder = recipe({
  base: {
    outlineOffset: '0px',
    borderWidth: '0px'
  },
  variants: {
    variant: {
      category1: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.brand.category1,
          darkMode: vars.color.dark.brand.category1
        }
      }),
      category2: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.brand.category2,
          darkMode: vars.color.dark.brand.category2
        }
      }),
      category3: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.brand.category3,
          darkMode: vars.color.dark.brand.category3
        }
      }),
      category4: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.brand.category4,
          darkMode: vars.color.dark.brand.category4
        }
      }),
      category5: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.brand.category5,
          darkMode: vars.color.dark.brand.category5
        }
      }),
      category6: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.brand.category6,
          darkMode: vars.color.dark.brand.category6
        }
      })
    },
    ...createWidthVariants()
  },
  defaultVariants: {
    variant: 'category1'
  }
});
export type BrandBorderVariants = RecipeVariants<typeof brandBorder>;
