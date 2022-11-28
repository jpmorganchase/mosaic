import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { neutralBorder } from '../border';

export const tr = recipe({
  base: neutralBorder({ variant: 'low', borderBottomWidth: 'thin' })
});
export type TrVariants = RecipeVariants<typeof tr>;
