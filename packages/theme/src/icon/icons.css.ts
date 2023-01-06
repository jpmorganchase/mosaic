import { assignVars, styleVariants } from '@vanilla-extract/css';
import { iconSizeVars } from '../salt';

export const icon = styleVariants({
  small: {
    vars: assignVars(iconSizeVars, {
      size: '1 !important'
    })
  },
  medium: {
    vars: assignVars(iconSizeVars, {
      size: '2 !important'
    })
  },
  large: {
    vars: assignVars(iconSizeVars, {
      size: '3 !important'
    })
  }
});
