import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { marginProperties, paddingProperties, responsiveSprinkles } from '../responsive';

const amountProperties = defineProperties({
  properties: {
    fontSize: { size1: vars.fontSize.s210 },
    fontWeight: {
      light: vars.fontWeight.light
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

export const amountSprinkles = createSprinkles(
  amountProperties,
  marginProperties,
  paddingProperties
);

export type AmountSprinkles = Parameters<typeof amountSprinkles>[0];

export const amount = recipe({
  variants: {
    variant: {
      amount1: amountSprinkles({
        size: 'size1',
        weight: 'light',
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
    variant: 'amount1',
    context: 'component'
  }
});
export type AmountVariants = RecipeVariants<typeof amount>;
