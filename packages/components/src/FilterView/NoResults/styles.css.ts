import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    responsiveSprinkles({
      paddingTop: ['x8', 'x8', 'x8', 'x8']
    }),
    {
      flexGrow: 1
    }
  ])
};
