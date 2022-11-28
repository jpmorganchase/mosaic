import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { borderSprinkles } from './border.css';
import createWidthVariants from './createWidthVariants';

export const statusBorder = recipe({
  base: {
    outlineOffset: '0px',
    borderWidth: '0px'
  },
  variants: {
    variant: {
      info: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.status.info,
          darkMode: vars.color.dark.status.info
        }
      }),
      alert: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.status.alert,
          darkMode: vars.color.dark.status.alert
        }
      }),
      negative: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.status.negative,
          darkMode: vars.color.dark.status.negative
        }
      }),
      positive: borderSprinkles({
        borderStyle: 'solid',
        borderColor: {
          lightMode: vars.color.light.status.positive,
          darkMode: vars.color.dark.status.positive
        }
      })
    },
    ...createWidthVariants()
  },
  defaultVariants: {
    variant: 'info'
  }
});
export type StatusBorderVariants = RecipeVariants<typeof statusBorder>;
