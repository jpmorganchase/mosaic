import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { lightModeConditions } from './lightMode';

export const calloutColorProperties = defineProperties({
  conditions: lightModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    backgroundColor: [
      ...Object.values(vars.color.light.callout),
      ...Object.values(vars.color.dark.callout)
    ],
    color: [...Object.values(vars.color.light.callout), ...Object.values(vars.color.dark.callout)]
  }
});
export const calloutColorSprinkles = createSprinkles(calloutColorProperties);
export type CalloutColorSprinkles = Parameters<typeof calloutColorSprinkles>[0];
export const calloutColor = recipe({
  variants: {
    variant: {
      note: calloutColorSprinkles({
        color: {
          lightMode: vars.color.light.callout.note,
          darkMode: vars.color.dark.callout.note
        }
      }),
      important: calloutColorSprinkles({
        color: {
          lightMode: vars.color.light.callout.important,
          darkMode: vars.color.dark.callout.important
        }
      }),
      tip: calloutColorSprinkles({
        color: {
          lightMode: vars.color.light.callout.tip,
          darkMode: vars.color.dark.callout.tip
        }
      }),
      caution: calloutColorSprinkles({
        color: {
          lightMode: vars.color.light.callout.caution,
          darkMode: vars.color.dark.callout.caution
        }
      }),
      warning: calloutColorSprinkles({
        color: {
          lightMode: vars.color.light.callout.warning,
          darkMode: vars.color.dark.callout.warning
        }
      })
    }
  }
});
export type CalloutColorVariants = RecipeVariants<typeof calloutColor>;

export const calloutBackgroundColor = recipe({
  variants: {
    variant: {
      note: calloutColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.callout.note,
          darkMode: vars.color.dark.callout.note
        }
      }),
      important: calloutColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.callout.important,
          darkMode: vars.color.dark.callout.important
        }
      }),
      tip: calloutColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.callout.tip,
          darkMode: vars.color.dark.callout.tip
        }
      }),
      caution: calloutColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.callout.caution,
          darkMode: vars.color.dark.callout.caution
        }
      }),
      warning: calloutColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.callout.warning,
          darkMode: vars.color.dark.callout.warning
        }
      })
    }
  }
});
export type CalloutBackgroundColorVariants = RecipeVariants<typeof calloutBackgroundColor>;
