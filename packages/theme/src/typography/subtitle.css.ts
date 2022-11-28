import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { marginProperties, paddingProperties, responsiveSprinkles } from '../responsive';

const subtitleProperties = defineProperties({
  properties: {
    fontSize: {
      size1: vars.fontSize.s130,
      size2: vars.fontSize.s125,
      size3: vars.fontSize.s120,
      size4: vars.fontSize.s110,
      size5: vars.fontSize.s100,
      size6: vars.fontSize.s90
    },
    fontWeight: { semibold: vars.fontWeight.semibold },
    letterSpacing: [0],
    lineHeight: [1.3]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const subtitleSprinkles = createSprinkles(
  subtitleProperties,
  marginProperties,
  paddingProperties
);

export type SubtitleSprinkles = Parameters<typeof subtitleSprinkles>[0];

export const subtitle = recipe({
  variants: {
    variant: {
      subtitle1: subtitleSprinkles({
        size: 'size1',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      subtitle2: subtitleSprinkles({
        size: 'size2',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      subtitle3: subtitleSprinkles({
        size: 'size3',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      subtitle4: subtitleSprinkles({
        size: 'size4',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      subtitle5: subtitleSprinkles({
        size: 'size5',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      subtitle6: subtitleSprinkles({
        size: 'size6',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      })
    },
    context: {
      component: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] }),
      markdown: responsiveSprinkles({ marginTop: ['x6', 'x6', 'x6', 'x6'] })
    }
  },
  defaultVariants: {
    variant: 'subtitle1',
    context: 'component'
  }
});
export type SubtitleVariants = RecipeVariants<typeof subtitle>;
