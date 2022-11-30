import { style } from '@vanilla-extract/css';
import { responsiveSprinkles, paragraph } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      flexGrow: 1,
      display: 'inline-block'
    },
    responsiveSprinkles({ marginBottom: ['x2', 'x2', 'x2', 'x2'] }),
    paragraph({ variant: 'paragraph2' })
  ])
};
