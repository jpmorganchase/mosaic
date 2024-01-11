import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { paragraph } from '../typography/index.css';

export const th = recipe({
  base: style([
    style({ textAlign: 'inherit' }),
    paragraph({ variant: 'paragraph3' }),
    responsiveSprinkles({ padding: ['x4', 'x4', 'x4', 'x4'] })
  ])
});
export type ThVariants = RecipeVariants<typeof th>;
