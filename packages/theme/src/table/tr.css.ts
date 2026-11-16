import { RecipeVariants } from '@vanilla-extract/recipes';
import { recipe } from '../recipe';

import { neutralBorder } from '../border';

export const tr = recipe({
  base: neutralBorder({ variant: 'low', borderBottomWidth: 'thin' })
});
export type TrVariants = RecipeVariants<typeof tr>;
