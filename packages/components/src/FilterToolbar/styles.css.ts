import { style } from '@vanilla-extract/css';
import { caption, responsiveSprinkles, neutralBorder } from '@jpmorganchase/mosaic-theme';

export default {
  root: style([
    {
      display: 'flex',
      flexWrap: 'nowrap',
      justifyContent: 'flex-end',
      alignItems: 'center'
    },
    caption({ variant: 'caption2' }),
    responsiveSprinkles({
      columnGap: ['x2', 'x2', 'x2', 'x2'],
      paddingX: ['x2', 'x2', 'x2', 'x2']
    }),
    neutralBorder({ variant: 'low', borderBottomWidth: 'thin' })
  ])
};
