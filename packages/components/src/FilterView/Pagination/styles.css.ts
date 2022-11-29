import { style } from '@vanilla-extract/css';
import { responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'flex',
      justifyContent: 'center',
      flexGrow: 1
    },
    responsiveSprinkles({
      marginTop: ['x1', 'x1', 'x1', 'x1']
    })
  ])
};
