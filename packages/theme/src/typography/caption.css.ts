import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { marginProperties, paddingProperties, responsiveSprinkles } from '../responsive';
import { vars } from '../vars.css';

const captionProperties = defineProperties({
  properties: {
    fontSize: {
      size1: vars.fontSize.s50,
      size2: vars.fontSize.s50,
      size3: vars.fontSize.s50,
      size4: vars.fontSize.s40,
      size5: vars.fontSize.s40,
      size6: vars.fontSize.s40
    },
    fontWeight: {
      bold: vars.fontWeight.bold,
      regular: vars.fontWeight.regular,
      semibold: vars.fontWeight.semibold
    },
    letterSpacing: [0],
    lineHeight: [1.3]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const captionSprinkles = createSprinkles(
  captionProperties,
  marginProperties,
  paddingProperties
);

export type CaptionSprinkles = Parameters<typeof captionSprinkles>[0];

export const caption = recipe({
  variants: {
    variant: {
      caption1: captionSprinkles({
        size: 'size1',
        weight: 'bold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      caption2: captionSprinkles({
        size: 'size2',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      caption3: captionSprinkles({
        size: 'size3',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      caption4: captionSprinkles({
        size: 'size4',
        weight: 'bold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      caption5: captionSprinkles({
        size: 'size5',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      caption6: captionSprinkles({
        size: 'size6',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.3
      })
    },
    context: {
      component: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] }),
      markdown: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    }
  },
  defaultVariants: {
    variant: 'caption1',
    context: 'component'
  }
});
export type CaptionVariants = RecipeVariants<typeof caption>;
