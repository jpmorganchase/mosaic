import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const selectableBorder = recipe({
  base: {
    outlineOffset: '0px',
    borderWidth: '0px'
  },
  variants: {
    variant: {
      inEdit: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.selectable.inEdit,
          darkMode: vars.color.dark.selectable.inEdit
        }
      }),
      focusRing: borderSprinkles({
        borderStyle: 'dashed',
        borderColor: {
          lightMode: vars.color.light.selectable.inEdit,
          darkMode: vars.color.dark.selectable.inEdit
        }
      })
    },
    ...createWidthVariants()
  },
  defaultVariants: {
    variant: 'inEdit'
  }
});
export type SelectableBorderVariants = RecipeVariants<typeof selectableBorder>;
