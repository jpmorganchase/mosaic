import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { spaceVars } from '../responsive/vars.css';
import { backgroundColor, foregroundColor } from '../color';
import { neutralBorder } from '../border';
import { fontSizeVars, fontWeightVars } from './vars.css';

const vars = { fontSize: fontSizeVars, fontWeight: fontWeightVars };

export const code = recipe({
  variants: {
    base: { display: 'inline' },
    variant: {
      regular: style([
        {
          fontSize: vars.fontSize.s70,
          paddingLeft: spaceVars.horizontal.x2,
          paddingRight: spaceVars.horizontal.x2,
          whiteSpace: 'nowrap',
          selectors: {
            ['code.&']: {
              fontWeight: vars.fontWeight.light
            }
          }
        },
        neutralBorder({ variant: 'low', borderWidth: 'thin' }),
        backgroundColor({ variant: 'emphasis' }),
        foregroundColor({ variant: 'mid' })
      ])
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type CodeVariants = RecipeVariants<typeof code>;
