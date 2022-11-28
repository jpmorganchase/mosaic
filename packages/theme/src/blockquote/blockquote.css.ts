import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { responsiveSprinkles } from '../responsive';
import { siteBorder } from '../border';
import { heading } from '../typography';

export const blockquote = recipe({
  variants: {
    variant: {
      regular: style([
        {
          width: '100%',
          fontStyle: 'italic',
          position: 'relative'
        },
        siteBorder({ variant: 'unknown', borderLeftWidth: 'thick' }),
        heading({ variant: 'heading2' }),
        responsiveSprinkles({
          marginLeft: ['x2', 'x2', 'x2', 'x2'],
          paddingLeft: ['x25', 'x25', 'x25', 'x25']
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
export type BlockquoteVariants = RecipeVariants<typeof blockquote>;
