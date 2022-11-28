import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { lightModeConditions } from '../color';
import { vars } from '../vars.css';

export const opacityProperties = defineProperties({
  conditions: lightModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    opacity: [
      vars.opacity.light.disabled,
      vars.opacity.dark.disabled,
      vars.opacity.light.watermark,
      vars.opacity.dark.watermark
    ]
  }
});

export const opacitySprinkles = createSprinkles(opacityProperties);
export type OpacitySprinkles = Parameters<typeof opacitySprinkles>[0];

export const opacity = recipe({
  variants: {
    variant: {
      disabled: opacitySprinkles({
        opacity: {
          lightMode: vars.opacity.light.disabled,
          darkMode: vars.opacity.dark.disabled
        }
      }),
      watermark: opacitySprinkles({
        opacity: {
          lightMode: vars.opacity.light.watermark,
          darkMode: vars.opacity.dark.watermark
        }
      })
    }
  }
});
export type OpacityVariants = RecipeVariants<typeof opacity>;
