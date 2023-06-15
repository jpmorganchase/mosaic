import { style } from '@vanilla-extract/css';
import { primaryColor, vars } from '@jpmorganchase/mosaic-theme';

export default {
  active: primaryColor({ variant: 'regular' }),
  root: style({
    width: '28px',
    height: '28px',
    padding: vars.space.horizontal.none,
    color: vars.color.dark.neutral.foreground.low
  })
};
