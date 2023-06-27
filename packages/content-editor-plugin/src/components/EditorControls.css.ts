import { style } from '@vanilla-extract/css';
import { backgroundColor, vars } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([backgroundColor({ variant: 'regular' }), style({ height: vars.space.vertical.x8 })])
};
