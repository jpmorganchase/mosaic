import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      whiteSpace: 'normal'
    },
    responsiveSprinkles({ marginBottom: ['x4', 'x4', 'x4', 'x4'] })
  ])
};
