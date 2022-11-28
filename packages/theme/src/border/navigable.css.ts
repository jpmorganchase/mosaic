import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const navigableBorder = recipe({
  base: {
    borderWidth: '0px',
    borderStyle: 'solid'
  },
  variants: {
    variant: {
      selected: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightModeSelected: vars.color.light.navigable.selectableLink.selected,
          darkModeSelected: vars.color.dark.navigable.selectableLink.selected
        }
      }),
      hover: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.navigable.selectableLink.hover,
          darkMode: vars.color.dark.navigable.selectableLink.hover
        }
      }),
      unselected: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightModeUnselected: vars.color.light.navigable.selectableLink.unselected,
          darkModeUnselected: vars.color.dark.navigable.selectableLink.unselected
        }
      }),
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
    variant: 'unselected'
  }
});
export type NavigableBorderVariants = RecipeVariants<typeof navigableBorder>;
