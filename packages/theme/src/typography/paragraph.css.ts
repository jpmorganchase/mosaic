import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { fontSizeVars, fontWeightVars } from './vars.css';

const vars = { fontSize: fontSizeVars, fontWeight: fontWeightVars };

const paragraphProperties = defineProperties({
  properties: {
    fontSize: {
      size1: vars.fontSize.s80,
      size2: vars.fontSize.s80,
      size3: vars.fontSize.s70,
      size4: vars.fontSize.s70,
      size5: vars.fontSize.s60,
      size6: vars.fontSize.s60
    },
    fontWeight: {
      bold: vars.fontWeight.bold,
      regular: vars.fontWeight.regular,
      semibold: vars.fontWeight.semibold
    },
    letterSpacing: [0],
    lineHeight: [1.5]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const paragraphSprinkles = createSprinkles(paragraphProperties);

export type ParagraphSprinkles = Parameters<typeof paragraphSprinkles>[0];

export const paragraph = recipe({
  variants: {
    variant: {
      paragraph1: paragraphSprinkles({
        size: 'size1',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.5
      }),
      paragraph2: paragraphSprinkles({
        size: 'size2',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.5
      }),
      paragraph3: paragraphSprinkles({
        size: 'size3',
        weight: 'bold',
        letterSpacing: 0,
        lineHeight: 1.5
      }),
      paragraph4: paragraphSprinkles({
        size: 'size4',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.5
      }),
      paragraph5: paragraphSprinkles({
        size: 'size5',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.5
      }),
      paragraph6: paragraphSprinkles({
        size: 'size6',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.5
      })
    },
    context: {
      component: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] }),
      markdown: responsiveSprinkles({ marginTop: ['x6', 'x6', 'x6', 'x6'] })
    }
  },
  defaultVariants: {
    variant: 'paragraph1',
    context: 'component'
  }
});
export type ParagraphVariants = RecipeVariants<typeof paragraph>;
