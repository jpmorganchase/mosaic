import { style } from '@vanilla-extract/css';

import { POPPER_Z_INDEX } from '../Popper/Popper.css';

export default {
  menu: style({
    zIndex: POPPER_Z_INDEX + 1
  })
};
