import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'nowrap',
      justifyContent: 'flex-end'
    },
    responsiveSprinkles({
      columnGap: ['x2', 'x2', 'x2', 'x2'],
      paddingY: ['x4', 'x4', 'x4', 'x4']
    })
  ])
};
