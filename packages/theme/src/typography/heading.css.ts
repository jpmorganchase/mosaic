import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import {
  marginProperties,
  paddingProperties,
  responsiveConditions,
  responsiveSprinkles
} from '../responsive';

const headingProperties = defineProperties({
  conditions: responsiveConditions,
  defaultCondition: 'mobile',
  responsiveArray: ['mobile', 'tablet', 'web', 'desktop'],
  properties: {
    fontSize: {
      size0: vars.fontSize.s270,
      size1: vars.fontSize.s210,
      size2: vars.fontSize.s190,
      size3: vars.fontSize.s180,
      size4: vars.fontSize.s150,
      size5: vars.fontSize.s130,
      size6: vars.fontSize.s110,
      size7: vars.fontSize.s90
    },
    fontWeight: {
      semibold: vars.fontWeight.semibold,
      bold: vars.fontWeight.bold,
      extrabold: vars.fontWeight.extrabold
    },
    letterSpacing: [0, -1],
    lineHeight: [1.1, 1.2, 1.3]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const headingSprinkles = createSprinkles(
  headingProperties,
  marginProperties,
  paddingProperties
);

export type HeadingSprinkles = Parameters<typeof headingSprinkles>[0];

export const heading = recipe({
  base: { textDecoration: 'none' },
  variants: {
    variant: {
      heading0: headingSprinkles({
        size: ['size2', 'size2', 'size0', 'size0'],
        weight: 'extrabold',
        letterSpacing: -1,
        lineHeight: 1.1
      }),
      heading1: headingSprinkles({
        size: ['size3', 'size3', 'size1', 'size1'],
        weight: 'extrabold',
        letterSpacing: -1,
        lineHeight: 1.2
      }),
      heading2: headingSprinkles({
        size: 'size4',
        weight: 'bold',
        letterSpacing: -1,
        lineHeight: 1.2
      }),
      heading3: headingSprinkles({
        size: 'size5',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.2
      }),
      heading4: headingSprinkles({
        size: 'size6',
        weight: 'semibold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      heading5: headingSprinkles({
        size: 'size6',
        weight: 'bold',
        letterSpacing: 0,
        lineHeight: 1.3
      }),
      heading6: headingSprinkles({
        size: 'size7',
        weight: 'bold',
        letterSpacing: 0,
        lineHeight: 1.3
      })
    },
    context: {
      component: responsiveSprinkles({
        marginTop: ['none', 'none', 'none', 'none']
      }),
      markdown: responsiveSprinkles({
        marginTop: ['x6', 'x6', 'x6', 'x6']
      })
    }
  },
  compoundVariants: [
    {
      variants: {
        variant: 'heading0',
        context: 'markdown'
      },
      style: {
        marginTop: vars.space.vertical.none
      }
    },
    {
      variants: {
        variant: 'heading1',
        context: 'markdown'
      },
      style: {
        marginTop: vars.space.vertical.none
      }
    },
    {
      variants: {
        variant: 'heading2',
        context: 'markdown'
      },
      style: {
        marginTop: vars.space.vertical.x13
      }
    },
    {
      variants: {
        variant: 'heading3',
        context: 'markdown'
      },
      style: {
        marginTop: vars.space.vertical.x10
      }
    },
    {
      variants: {
        variant: 'heading4',
        context: 'markdown'
      },
      style: {
        marginTop: vars.space.vertical.x10
      }
    }
  ],
  defaultVariants: {
    variant: 'heading1',
    context: 'component'
  }
});
export type HeadingVariants = RecipeVariants<typeof heading>;
