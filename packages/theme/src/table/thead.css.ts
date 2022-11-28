import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from '../border';

export const thead = recipe({
  base: style([
    {
      textAlign: 'left'
    },
    borderSprinkles({
      borderStyle: 'solid',
      borderTopWidth: 'thin',
      borderBottomWidth: 'thin',
      borderLeftWidth: 'none',
      borderRightWidth: 'none',
      borderTopColor: {
        lightMode: vars.color.light.neutral.foreground.mid,
        darkMode: vars.color.dark.neutral.foreground.mid
      },
      borderBottomColor: {
        lightMode: vars.color.light.neutral.foreground.low,
        darkMode: vars.color.dark.neutral.foreground.low
      }
    })
  ])
});
export type THeadVariants = RecipeVariants<typeof thead>;
