import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

export const tag = recipe({
  variants: {
    variant: {
      regular: style([{ borderRadius: '3px' }])
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type TagVariants = RecipeVariants<typeof tag>;
