import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { fontSizeVars, fontWeightVars } from './vars.css';

const vars = { fontSize: fontSizeVars, fontWeight: fontWeightVars };

const eyebrowProperties = defineProperties({
  properties: {
    fontSize: { size1: vars.fontSize.s80 },
    fontWeight: {
      semibold: vars.fontWeight.semibold
    },
    letterSpacing: [3.5],
    lineHeight: [1.3]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const eyebrowSprinkles = createSprinkles(eyebrowProperties);

export type EyebrowSprinkles = Parameters<typeof eyebrowSprinkles>[0];

export const eyebrow = recipe({
  variants: {
    variant: {
      eyebrow1: eyebrowSprinkles({
        size: 'size1',
        weight: 'semibold',
        letterSpacing: 3.5,
        lineHeight: 1.3
      })
    },
    context: {
      component: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] }),
      markdown: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    }
  },
  defaultVariants: {
    variant: 'eyebrow1',
    context: 'component'
  }
});
export type EyebrowVariants = RecipeVariants<typeof eyebrow>;
