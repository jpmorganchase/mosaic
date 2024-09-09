import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { bothModeConditions } from './modes';

export const statusColorProperties = defineProperties({
  conditions: bothModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    backgroundColor: [
      ...Object.values(vars.color.light.status),
      ...Object.values(vars.color.dark.status)
    ],
    color: [...Object.values(vars.color.light.status), ...Object.values(vars.color.dark.status)]
  }
});
export const statusColorSprinkles = createSprinkles(statusColorProperties);
export type StatusColorSprinkles = Parameters<typeof statusColorSprinkles>[0];
export const statusColor = recipe({
  variants: {
    variant: {
      info: statusColorSprinkles({
        color: {
          lightMode: vars.color.light.status.info,
          darkMode: vars.color.dark.status.info
        }
      }),
      alert: statusColorSprinkles({
        color: {
          lightMode: vars.color.light.status.alert,
          darkMode: vars.color.dark.status.alert
        }
      }),
      positive: statusColorSprinkles({
        color: {
          lightMode: vars.color.light.status.positive,
          darkMode: vars.color.dark.status.positive
        }
      }),
      negative: statusColorSprinkles({
        color: {
          lightMode: vars.color.light.status.negative,
          darkMode: vars.color.dark.status.negative
        }
      })
    }
  }
});
export type StatusColorVariants = RecipeVariants<typeof statusColor>;

export const statusBackgroundColor = recipe({
  variants: {
    variant: {
      info: statusColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.status.info,
          darkMode: vars.color.dark.status.info
        }
      }),
      alert: statusColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.status.alert,
          darkMode: vars.color.dark.status.alert
        }
      }),
      positive: statusColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.status.positive,
          darkMode: vars.color.dark.status.positive
        }
      }),
      negative: statusColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.status.negative,
          darkMode: vars.color.dark.status.negative
        }
      })
    }
  }
});
export type StatusBackgroundColorVariants = RecipeVariants<typeof statusBackgroundColor>;
