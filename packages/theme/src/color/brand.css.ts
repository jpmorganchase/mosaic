import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { lightModeConditions } from './lightMode';

export const brandColorProperties = defineProperties({
  conditions: lightModeConditions,
  defaultCondition: ['lightMode', 'darkMode'],
  properties: {
    color: [...Object.values(vars.color.light.brand), ...Object.values(vars.color.dark.brand)],
    backgroundColor: [
      ...Object.values(vars.color.light.brand),
      ...Object.values(vars.color.dark.brand)
    ]
  }
});
export const brandColorSprinkles = createSprinkles(brandColorProperties);
export type BrandColorSprinkles = Parameters<typeof brandColorSprinkles>[0];
export const brandColor = recipe({
  variants: {
    variant: {
      category1: brandColorSprinkles({
        color: {
          lightMode: vars.color.light.brand.category1,
          darkMode: vars.color.dark.brand.category1
        }
      }),
      category2: brandColorSprinkles({
        color: {
          lightMode: vars.color.light.brand.category2,
          darkMode: vars.color.dark.brand.category2
        }
      }),
      category3: brandColorSprinkles({
        color: {
          lightMode: vars.color.light.brand.category3,
          darkMode: vars.color.dark.brand.category3
        }
      }),
      category4: brandColorSprinkles({
        color: {
          lightMode: vars.color.light.brand.category4,
          darkMode: vars.color.dark.brand.category4
        }
      }),
      category5: brandColorSprinkles({
        color: {
          lightMode: vars.color.light.brand.category5,
          darkMode: vars.color.dark.brand.category5
        }
      }),
      category6: brandColorSprinkles({
        color: {
          lightMode: vars.color.light.brand.category6,
          darkMode: vars.color.dark.brand.category6
        }
      })
    }
  }
});
export type BrandColorVariants = RecipeVariants<typeof brandColor>;

export const brandBackgroundColor = recipe({
  variants: {
    variant: {
      category1: brandColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.brand.category1,
          darkMode: vars.color.dark.brand.category1
        }
      }),
      category2: brandColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.brand.category2,
          darkMode: vars.color.dark.brand.category2
        }
      }),
      category3: brandColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.brand.category3,
          darkMode: vars.color.dark.brand.category3
        }
      }),
      category4: brandColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.brand.category4,
          darkMode: vars.color.dark.brand.category4
        }
      }),
      category5: brandColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.brand.category5,
          darkMode: vars.color.dark.brand.category5
        }
      }),
      category6: brandColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.brand.category6,
          darkMode: vars.color.dark.brand.category6
        }
      })
    }
  }
});
export type BrandBackgroundColorVariants = RecipeVariants<typeof brandBackgroundColor>;
