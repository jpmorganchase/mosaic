import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      flexGrow: 1
    },
    responsiveSprinkles({ paddingY: ['x4', 'x4', 'x4', 'x4'] })
  ])
};
