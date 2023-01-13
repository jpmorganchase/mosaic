import { style } from '@vanilla-extract/css';
import { vars, responsiveSprinkles } from '@jpmorganchase/mosaic-theme';

export default {
  toolbar: style({
    display: 'flex',
    justifyContent: 'flex-end'
  }),
  feedback: style([
    {
      display: 'flex',
      alignItems: 'center',
      gap: vars.space.vertical.x4,
      flexDirection: 'column'
    },
    responsiveSprinkles({ padding: ['x10', 'x10', 'x10', 'x10'] })
  ]),
  pageCount: style([
    {
      margin: 'auto 0'
    },
    responsiveSprinkles({ paddingRight: ['x8', 'x8', 'x8', 'x8'] })
  ])
};
