import { style } from '@vanilla-extract/css';
import { primaryColor } from '@jpmorganchase/mosaic-theme';

export default {
  active: primaryColor({ variant: 'regular' }),
  root: style({
    width: '28px',
    height: '28px'
  })
};
