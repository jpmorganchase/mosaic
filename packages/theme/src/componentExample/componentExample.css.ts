import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { backgroundColorSprinkles, bothModeConditions } from '../color';

export const innerBackgroundProperties = defineProperties({
  conditions: bothModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    backgroundColor: [
      vars.component.componentExample.light.innerBackground,
      vars.component.componentExample.dark.innerBackground
    ]
  }
});
export const innerBackgroundSprinkles = createSprinkles(innerBackgroundProperties);
export type InnerBackgroundSprinkles = Parameters<typeof innerBackgroundSprinkles>[0];

export const outerBackgroundProperties = defineProperties({
  conditions: bothModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    backgroundColor: [
      vars.component.componentExample.light.outerBackground,
      vars.component.componentExample.dark.outerBackground
    ]
  }
});
export const outerBackgroundSprinkles = createSprinkles(outerBackgroundProperties);
export type OuterBackgroundSprinkles = Parameters<typeof outerBackgroundSprinkles>[0];

export const componentExample = recipe({
  variants: {
    backgroundColor: {
      component: backgroundColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.neutral.background.regular,
          darkMode: vars.color.dark.neutral.background.regular
        }
      }),
      inner: innerBackgroundSprinkles({
        backgroundColor: {
          lightMode: vars.component.componentExample.light.innerBackground,
          darkMode: vars.component.componentExample.dark.innerBackground
        }
      }),
      outer: outerBackgroundSprinkles({
        backgroundColor: {
          lightMode: vars.component.componentExample.light.outerBackground,
          darkMode: vars.component.componentExample.dark.outerBackground
        }
      })
    }
  }
});
export type ComponentExampleVariants = RecipeVariants<typeof componentExample>;
