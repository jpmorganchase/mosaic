import { style } from '@vanilla-extract/css';
import { RecipeVariants } from '@vanilla-extract/recipes';
import { recipe } from '../recipe';

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
