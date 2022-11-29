import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'flex',
      flexGrow: 1,
      justifyContent: 'flex-start'
    },
    responsiveSprinkles({
      marginRight: ['x2', 'x2', 'x2', 'x2'],
      columnGap: ['x2', 'x2', 'x2', 'x2']
    })
  ])
};
