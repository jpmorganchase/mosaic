import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const calloutBorder = recipe({
  base: {
    outlineOffset: '0px',
    borderWidth: '0px'
  },
  variants: {
    variant: {
      note: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.callout.note,
          darkMode: vars.color.dark.callout.note
        }
      }),
      important: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.callout.important,
          darkMode: vars.color.dark.callout.important
        }
      }),
      tip: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.callout.tip,
          darkMode: vars.color.dark.callout.tip
        }
      }),
      caution: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.callout.caution,
          darkMode: vars.color.dark.callout.caution
        }
      }),
      warning: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.callout.warning,
          darkMode: vars.color.dark.callout.warning
        }
      })
    },
    ...createWidthVariants()
  },
  defaultVariants: {
    variant: 'note'
  }
});
export type CalloutBorderVariants = RecipeVariants<typeof calloutBorder>;
