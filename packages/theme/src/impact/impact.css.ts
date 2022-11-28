import { style } from '@vanilla-extract/css';

import { responsiveStyle } from '../responsive/responsiveStyle';
import { vars } from '../vars.css';

export const impact = {
  image: style([responsiveStyle(vars.component.impact.image)]),
  line: style([responsiveStyle(vars.component.impact.line)])
};
