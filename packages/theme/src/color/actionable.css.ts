import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { vars } from '../vars.css';
import { darkMode, lightMode, lightModeConditions } from './lightMode';

export const ctaColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover` },
    darkModeHover: { selector: `${darkMode} &:hover` },
    lightModeActive: { selector: `${lightMode} &:active` },
    darkModeActive: { selector: `${darkMode} &:active` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    backgroundColor: [
      ...Object.values(vars.color.light.actionable.cta),
      ...Object.values(vars.color.dark.actionable.cta)
    ],
    color: [
      ...Object.values(vars.color.light.actionable.label),
      ...Object.values(vars.color.dark.actionable.label)
    ]
  }
});

export const ctaColorSprinkles = createSprinkles(ctaColorProperties);
export type CtaColorSprinkles = Parameters<typeof ctaColorSprinkles>[0];
export const ctaColor = recipe({
  variants: {
    variant: {
      regular: ctaColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.actionable.cta.regular,
          lightModeHover: vars.color.light.actionable.cta.hover,
          lightModeActive: vars.color.light.actionable.cta.active,
          lightModeDisabled: vars.color.light.actionable.cta.disabled,
          darkMode: vars.color.dark.actionable.cta.regular,
          darkModeHover: vars.color.dark.actionable.cta.hover,
          darkModeActive: vars.color.dark.actionable.cta.active,
          darkModeDisabled: vars.color.dark.actionable.cta.disabled
        },
        color: {
          lightMode: vars.color.light.actionable.label.light,
          lightModeHover: vars.color.light.actionable.label.light,
          lightModeActive: vars.color.light.actionable.label.light,
          lightModeDisabled: vars.color.light.actionable.label.dark,
          darkMode: vars.color.dark.actionable.label.light,
          darkModeHover: vars.color.dark.actionable.label.light,
          darkModeActive: vars.color.dark.actionable.label.light,
          darkModeDisabled: vars.color.dark.actionable.label.dark
        }
      })
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type CtaColorVariants = RecipeVariants<typeof ctaColor>;

export const primaryColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover` },
    darkModeHover: { selector: `${darkMode} &:hover` },
    lightModeActive: { selector: `${lightMode} &:active` },
    darkModeActive: { selector: `${darkMode} &:active` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    backgroundColor: [
      ...Object.values(vars.color.light.actionable.primary),
      ...Object.values(vars.color.dark.actionable.primary)
    ],
    color: [
      ...Object.values(vars.color.light.actionable.label),
      ...Object.values(vars.color.dark.actionable.label)
    ]
  }
});
export const primaryColorSprinkles = createSprinkles(primaryColorProperties);
export type PrimaryColorSprinkles = Parameters<typeof primaryColorSprinkles>[0];
export const primaryColor = recipe({
  variants: {
    variant: {
      regular: primaryColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.actionable.primary.regular,
          lightModeHover: vars.color.light.actionable.primary.hover,
          lightModeActive: vars.color.light.actionable.primary.active,
          lightModeDisabled: vars.color.light.actionable.primary.disabled,
          darkMode: vars.color.dark.actionable.primary.regular,
          darkModeHover: vars.color.dark.actionable.primary.hover,
          darkModeActive: vars.color.dark.actionable.primary.active,
          darkModeDisabled: vars.color.dark.actionable.primary.disabled
        },
        color: {
          lightMode: vars.color.light.actionable.label.dark,
          lightModeHover: vars.color.light.actionable.label.dark,
          lightModeActive: vars.color.light.actionable.label.light,
          lightModeDisabled: vars.color.light.actionable.label.dark,
          darkMode: vars.color.dark.actionable.label.light,
          darkModeHover: vars.color.dark.actionable.label.light,
          darkModeActive: vars.color.dark.actionable.label.dark,
          darkModeDisabled: vars.color.dark.actionable.label.light
        }
      })
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type PrimaryColorVariants = RecipeVariants<typeof primaryColor>;

export const secondaryColorProperties = defineProperties({
  conditions: {
    ...lightModeConditions,
    lightModeHover: { selector: `${lightMode} &:hover` },
    darkModeHover: { selector: `${darkMode} &:hover` },
    lightModeActive: { selector: `${lightMode} &:active` },
    darkModeActive: { selector: `${darkMode} &:active` },
    lightModeDisabled: { selector: `${lightMode} &:disabled` },
    darkModeDisabled: { selector: `${darkMode} &:disabled` }
  },
  defaultCondition: 'lightMode',
  properties: {
    backgroundColor: [
      ...Object.values(vars.color.light.actionable.secondary),
      ...Object.values(vars.color.dark.actionable.secondary)
    ],
    color: [
      ...Object.values(vars.color.light.actionable.label),
      ...Object.values(vars.color.dark.actionable.label)
    ]
  }
});
export const secondaryColorSprinkles = createSprinkles(secondaryColorProperties);
export type SecondaryColorSprinkles = Parameters<typeof secondaryColorSprinkles>[0];
export const secondaryColor = recipe({
  variants: {
    variant: {
      regular: secondaryColorSprinkles({
        backgroundColor: {
          lightMode: vars.color.light.actionable.secondary.regular,
          lightModeHover: vars.color.light.actionable.secondary.hover,
          lightModeActive: vars.color.light.actionable.secondary.active,
          lightModeDisabled: vars.color.light.actionable.secondary.disabled,
          darkMode: vars.color.dark.actionable.secondary.regular,
          darkModeHover: vars.color.dark.actionable.secondary.hover,
          darkModeActive: vars.color.dark.actionable.secondary.active,
          darkModeDisabled: vars.color.dark.actionable.secondary.disabled
        },
        color: {
          lightMode: vars.color.light.actionable.label.dark,
          lightModeHover: vars.color.light.actionable.label.dark,
          lightModeActive: vars.color.light.actionable.label.light,
          lightModeDisabled: vars.color.light.actionable.label.dark,
          darkMode: vars.color.dark.actionable.label.light,
          darkModeHover: vars.color.dark.actionable.label.light,
          darkModeActive: vars.color.dark.actionable.label.dark,
          darkModeDisabled: vars.color.dark.actionable.label.light
        }
      })
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type SecondaryColorVariants = RecipeVariants<typeof secondaryColor>;
