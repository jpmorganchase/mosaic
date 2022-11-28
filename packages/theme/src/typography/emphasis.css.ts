import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { paragraphSprinkles } from './paragraph.css';

export const emphasis = recipe({
  variants: {
    base: { display: 'inline' },
    variant: {
      regular: style([
        {
          fontStyle: 'italic'
        },
        paragraphSprinkles({
          weight: 'semibold',
          letterSpacing: 0,
          lineHeight: 1.5
        })
      ]),
      strong: style([
        paragraphSprinkles({
          weight: 'bold',
          letterSpacing: 0,
          lineHeight: 1.5
        })
      ])
    },
    context: {
      component: style([
        responsiveSprinkles({
          marginTop: ['none', 'none', 'none', 'none']
        }),
        paragraphSprinkles({
          weight: 'semibold',
          letterSpacing: 0,
          lineHeight: 1.5
        })
      ]),
      markdown: responsiveSprinkles({ marginTop: ['x4', 'x4', 'x4', 'x4'] })
    }
  },
  defaultVariants: {
    variant: 'regular',
    context: 'component'
  }
});
export type EmphasisVariants = RecipeVariants<typeof emphasis>;
