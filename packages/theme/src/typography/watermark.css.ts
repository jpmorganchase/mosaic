import { style } from '@vanilla-extract/css';
import { defineProperties, createSprinkles } from '@vanilla-extract/sprinkles';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { vars } from '../vars.css';
import { marginProperties, paddingProperties, responsiveSprinkles } from '../responsive';
import { opacity } from '../opacity';

const watermarkProperties = defineProperties({
  properties: {
    fontSize: { size1: vars.fontSize.s180 },
    fontWeight: {
      regular: vars.fontWeight.regular
    },
    letterSpacing: [3.5],
    lineHeight: [1.5]
  },
  shorthands: {
    height: ['lineHeight'],
    size: ['fontSize'],
    weight: ['fontWeight']
  }
});

export const watermarkSprinkles = createSprinkles(
  watermarkProperties,
  marginProperties,
  paddingProperties
);

export type WatermarkSprinkles = Parameters<typeof watermarkSprinkles>[0];

export const watermark = recipe({
  base: opacity({ variant: 'watermark' }),
  variants: {
    variant: {
      blockquote: style({
        selectors: {
          '&:before': {
            content: 'open-quote',
            fontSize: '3em',
            position: 'absolute',
            left: '0.25em',
            top: '-0.25em'
          }
        }
      }),
      regular: style([
        watermarkSprinkles({
          size: 'size1',
          weight: 'regular',
          letterSpacing: 3.5,
          lineHeight: 1.5
        })
      ])
    },
    context: {
      component: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] }),
      markdown: responsiveSprinkles({ marginTop: ['none', 'none', 'none', 'none'] })
    }
  },
  defaultVariants: {
    variant: 'regular',
    context: 'component'
  }
});
export type WatermarkVariants = RecipeVariants<typeof watermark>;
