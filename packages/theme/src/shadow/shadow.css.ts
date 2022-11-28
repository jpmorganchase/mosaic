import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { lightModeConditions } from '../color';
import { vars } from '../vars.css';

export const shadowProperties = defineProperties({
  conditions: lightModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    boxShadow: [
      vars.shadow.unknown,
      vars.shadow.light.elevation1,
      vars.shadow.light.elevation2,
      vars.shadow.light.elevation3,
      vars.shadow.light.elevation4,
      vars.shadow.dark.elevation1,
      vars.shadow.dark.elevation2,
      vars.shadow.dark.elevation3,
      vars.shadow.dark.elevation4
    ]
  }
});

export const shadowSprinkles = createSprinkles(shadowProperties);
export type ShadowSprinkles = Parameters<typeof shadowSprinkles>[0];

export const shadow = recipe({
  variants: {
    variant: {
      unknown: shadowSprinkles({
        boxShadow: {
          lightMode: vars.shadow.unknown,
          darkMode: vars.shadow.unknown
        }
      }),
      elevation1: shadowSprinkles({
        boxShadow: {
          lightMode: vars.shadow.light.elevation1,
          darkMode: vars.shadow.dark.elevation1
        }
      }),
      elevation2: shadowSprinkles({
        boxShadow: {
          lightMode: vars.shadow.light.elevation2,
          darkMode: vars.shadow.dark.elevation2
        }
      }),
      elevation3: shadowSprinkles({
        boxShadow: {
          lightMode: vars.shadow.light.elevation3,
          darkMode: vars.shadow.dark.elevation3
        }
      }),
      elevation4: shadowSprinkles({
        boxShadow: {
          lightMode: vars.shadow.light.elevation4,
          darkMode: vars.shadow.dark.elevation4
        }
      })
    }
  }
});
export type ShadowVariants = RecipeVariants<typeof shadow>;
