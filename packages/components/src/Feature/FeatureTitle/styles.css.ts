import { style } from '@vanilla-extract/css';
import { heading, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    responsiveSprinkles({ marginBottom: ['x4', 'x4', 'x4', 'x4'] }),
    heading({ variant: 'heading3' })
  ])
};
