import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { calc } from '@vanilla-extract/css-utils';

import { vars } from '../vars.css';

export const gutterElement = recipe({
  variants: {
    variant: {
      anchor: {
        marginLeft: vars.space.horizontal.anchor
      },
      accent: {
        marginLeft: vars.space.horizontal.gutter,
        paddingLeft: calc(vars.space.horizontal.gutter)
          .multiply(-1)
          .subtract(vars.border.width.thick)
          .toString()
      }
    }
  }
});

export type GutterElementVariants = RecipeVariants<typeof gutterElement>;
