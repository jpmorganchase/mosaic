import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';

import { responsiveConditions, responsiveSprinkles } from '../responsive';
import { vars } from '../vars.css';
import { ctaColorSprinkles, primaryColorSprinkles, secondaryColorSprinkles } from '../color';

export const buttonSizeProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    height: {
      mobile: vars.component.button.mobile.height,
      tablet: vars.component.button.tablet.height,
      web: vars.component.button.web.height,
      desktop: vars.component.button.desktop.height
    },
    width: {
      mobile: vars.component.button.mobile.height,
      tablet: vars.component.button.tablet.height,
      web: vars.component.button.web.height,
      desktop: vars.component.button.desktop.height
    }
  }
});

export const buttonSizeSprinkles = createSprinkles(buttonSizeProperties);
export type ButtonSizeSprinkles = Parameters<typeof buttonSizeSprinkles>[0];

export const button = recipe({
  base: style([
    {
      border: 'none !important',
      boxSizing: 'content-box'
    },
    responsiveSprinkles({ paddingX: ['x2', 'x2', 'x2', 'x4'] })
  ]),
  variants: {
    variant: {
      cta: style([
        {
          borderRadius: vars.component.button.borderRadius
        },
        buttonSizeSprinkles({ height: ['mobile', 'tablet', 'web', 'desktop'] }),
        ctaColorSprinkles({
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
      ]),
      regular: style([
        {
          borderRadius: vars.component.button.borderRadius
        },
        buttonSizeSprinkles({ height: ['mobile', 'tablet', 'web', 'desktop'] }),
        primaryColorSprinkles({
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
      ]),
      square: style([
        {
          borderRadius: vars.component.button.borderRadius,
          paddingRight: '0 !important',
          paddingLeft: '0 !important'
        },
        buttonSizeSprinkles({
          height: ['mobile', 'tablet', 'web', 'desktop'],
          width: ['mobile', 'tablet', 'web', 'desktop']
        }),
        primaryColorSprinkles({
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
      ]),
      secondary: style([
        {
          borderRadius: vars.component.button.borderRadius
        },
        buttonSizeSprinkles({ height: ['mobile', 'tablet', 'web', 'desktop'] }),
        secondaryColorSprinkles({
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
      ])
    },
    context: {
      component: responsiveSprinkles({
        marginTop: ['none', 'none', 'none', 'none']
      }),
      markdown: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    }
  },
  defaultVariants: {
    variant: 'regular',
    context: 'component'
  }
});
export type ButtonVariants = RecipeVariants<typeof button>;
