import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { lightModeConditions } from './lightMode';

export const foregroundColorProperties = defineProperties({
  conditions: lightModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    color: [
      ...Object.values(vars.color.light.neutral.foreground),
      ...Object.values(vars.color.dark.neutral.foreground)
    ]
  }
});
export const foregroundColorSprinkles = createSprinkles(foregroundColorProperties);
export type ForegroundColorSprinkles = Parameters<typeof foregroundColorSprinkles>[0];
export const foregroundColor = recipe({
  variants: {
    variant: {
      high: foregroundColorSprinkles({
        color: {
          lightMode: vars.color.light.neutral.foreground.high,
          darkMode: vars.color.dark.neutral.foreground.high
        }
      }),
      mid: foregroundColorSprinkles({
        color: {
          lightMode: vars.color.light.neutral.foreground.mid,
          darkMode: vars.color.dark.neutral.foreground.mid
        }
      }),
      low: foregroundColorSprinkles({
        color: {
          lightMode: vars.color.light.neutral.foreground.low,
          darkMode: vars.color.dark.neutral.foreground.low
        }
      })
    }
  },
  defaultVariants: {
    variant: 'mid'
  }
});
export type ForegroundColorVariants = RecipeVariants<typeof foregroundColor>;

export const backgroundColorProperties = defineProperties({
  conditions: lightModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    backgroundColor: [
      ...Object.values(vars.color.light.neutral.background),
      ...Object.values(vars.color.dark.neutral.background)
    ]
  }
});
export const backgroundColorSprinkles = createSprinkles(backgroundColorProperties);
export type BackgroundColorSprinkles = Parameters<typeof backgroundColorSprinkles>[0];
export const backgroundColor = recipe({
  variants: {
    variant: {
      regular: backgroundColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.neutral.background.regular,
          darkMode: vars.color.dark.neutral.background.regular
        }
      }),
      emphasis: backgroundColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.neutral.background.emphasis,
          darkMode: vars.color.dark.neutral.background.emphasis
        }
      })
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type BackgroundColorVariants = RecipeVariants<typeof backgroundColor>;
