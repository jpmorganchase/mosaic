import { style } from '@vanilla-extract/css';
import { backgroundColor, shadow } from '@jpmorganchase/mosaic-theme';

export const POPPER_Z_INDEX = 10;

export default {
  root: style([
    style({ zIndex: POPPER_Z_INDEX }),
    backgroundColor({ variant: 'regular' }),
    shadow({ variant: 'elevation3' })
  ])
};
