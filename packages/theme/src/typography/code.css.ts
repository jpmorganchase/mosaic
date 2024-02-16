import { style, globalStyle } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';

import { spaceVars } from '../responsive/vars.css';
import { neutralBorder } from '../border';
import { fontSizeVars, fontWeightVars } from './vars.css';
import { lightMode, darkMode, backgroundColor } from '../color';

const vars = { fontSize: fontSizeVars, fontWeight: fontWeightVars };

export const code = recipe({
  variants: {
    base: { display: 'inline' },
    variant: {
      regular: style([
        {
          fontFamily: 'var(--salt-typography-fontFamily-code)',
          fontSize: vars.fontSize.s70,
          paddingLeft: spaceVars.horizontal.x2,
          paddingRight: spaceVars.horizontal.x2,
          whiteSpace: 'pre-wrap',
          selectors: {
            ['code.&']: {
              fontWeight: vars.fontWeight.light
            }
          }
        },
        backgroundColor({ variant: 'emphasis' }),
        neutralBorder({ variant: 'low', borderWidth: 'thin' })
      ])
    }
  },
  defaultVariants: {
    variant: 'regular'
  }
});
export type CodeVariants = RecipeVariants<typeof code>;

/**
 * Apply correct colors in light/dark mode
 * https://rehype-pretty-code.netlify.app/#multiple-themes-dark-and-light-mode
 */
globalStyle(
  `${lightMode} code[data-theme*=" "],
  ${lightMode} code[data-theme*=" "] span`,
  {
    color: 'var(--shiki-light)'
  }
);

globalStyle(
  `${darkMode} code[data-theme*=" "],
  ${darkMode} code[data-theme*=" "] span`,
  {
    color: 'var(--shiki-dark)'
  }
);
