import { style } from '@vanilla-extract/css';
import { navigableBorder, neutralBorder, paragraph, shadow } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    paragraph({ variant: 'paragraph6' }),
    {
      display: 'flex'
    }
  ]),
  border: neutralBorder({ variant: 'low', borderWidth: 'thin' }),
  hover: style([{ cursor: 'pointer' }, shadow({ variant: 'elevation1' })]),
  hoverFullWidth: style({ cursor: 'pointer' }),
  focused: navigableBorder({ variant: 'focusRing' })
};
