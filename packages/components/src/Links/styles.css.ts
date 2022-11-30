import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'flex',
      flexDirection: 'column',
      flexWrap: 'wrap'
    },
    responsiveSprinkles({ rowGap: ['x4', 'x4', 'x4', 'x4'] })
  ])
};
