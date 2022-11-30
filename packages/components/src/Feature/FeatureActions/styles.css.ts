import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'flex'
    },
    responsiveSprinkles({
      columnGap: ['x2', 'x2', 'x2', 'x2'],
      marginBottom: ['x6', 'x6', 'x6', 'x6'],
      marginTop: ['x2', 'x2', 'x2', 'x2']
    })
  ])
};
