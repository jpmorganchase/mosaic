import { styleVariants } from '@vanilla-extract/css';

import { vars } from '../vars.css';

export const hero = styleVariants({
  frame: [
    {
      minWidth: vars.component.hero.frame.minWidth,
      minHeight: vars.component.hero.frame.minHeight
    }
  ],
  frameImage: vars.component.hero.frameImage,
  frameBackgroundImage: vars.component.hero.frameBackgroundImage
});
