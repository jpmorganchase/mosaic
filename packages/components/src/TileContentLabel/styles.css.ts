import { style } from '@vanilla-extract/css';
import { caption, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  labelHover: style({
    cursor: 'pointer'
  }),
  numRemaining: caption({ variant: 'caption4' }),
  root: style([
    caption({ variant: 'caption5' }),
    responsiveSprinkles({
      marginTop: ['x2', 'x2', 'x2', 'x2'],
      marginRight: ['x1', 'x1', 'x1', 'x1']
    })
  ]),
  tooltipContent: style([
    {
      flexDirection: 'column'
    },
    responsiveSprinkles({ paddingLeft: ['none', 'none', 'none', 'none'] })
  ])
};
