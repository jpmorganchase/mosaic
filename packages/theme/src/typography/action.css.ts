import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { fontSizeVars, fontWeightVars } from './vars.css';

const vars = { fontSize: fontSizeVars, fontWeight: fontWeightVars };

const actionProperties = defineProperties({
  properties: {
    fontSize: {
      size1: vars.fontSize.s50,
      size2: vars.fontSize.s60,
      size3: vars.fontSize.s70,
      size4: vars.fontSize.s80,
      size5: vars.fontSize.s50,
      size6: vars.fontSize.s50,
      size7: vars.fontSize.s50,
      size8: vars.fontSize.s150
    },
    fontWeight: {
      bold: vars.fontWeight.bold,
      regular: vars.fontWeight.regular,
      semibold: vars.fontWeight.semibold
    },
    letterSpacing: [-1, 0, 0.6],
    lineHeight: [1.2, 1.3, 1.4, 1.5]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const actionSprinkles = createSprinkles(actionProperties);

export type ActionSprinkles = Parameters<typeof actionSprinkles>[0];

export const action = recipe({
  variants: {
    variant: {
      action1: actionSprinkles({
        size: 'size1',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.4
      }),
      action2: actionSprinkles({
        size: 'size2',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.4
      }),
      action3: actionSprinkles({
        size: 'size3',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      action4: actionSprinkles({
        size: 'size4',
        weight: 'regular',
        letterSpacing: 0,
        lineHeight: 1.5
      }),
      action5: actionSprinkles({
        size: 'size5',
        weight: 'bold',
        letterSpacing: 0.6,
        lineHeight: 1.3
      }),
      action6: actionSprinkles({
        size: 'size6',
        weight: 'bold',
        letterSpacing: 0.6,
        lineHeight: 1.3
      }),
      action7: actionSprinkles({
        size: 'size7',
        weight: 'bold',
        letterSpacing: 0.6,
        lineHeight: 1.3
      }),
      action8: actionSprinkles({
        size: 'size8',
        weight: 'bold',
        letterSpacing: -1,
        lineHeight: 1.2
      })
    },
    context: {
      component: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] }),
      markdown: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] })
    }
  },
  defaultVariants: {
    variant: 'action1',
    context: 'component'
  }
});
export type ActionVariants = RecipeVariants<typeof action>;
